'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPackFromSuggestion } from '@/lib/packs/build';
import { rotateAndCompose } from '@/lib/packs/autocompose';

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

const IdSchema = z.object({ suggestionId: z.string().uuid() });

/** Création 1-clic depuis une suggestion : nom + narratif IA + visuel + publication. */
export async function createPackFromSuggestion(formData) {
  await requireStaff();
  const parsed = IdSchema.safeParse({ suggestionId: formData.get('suggestionId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: sugg } = await admin
    .from('pack_suggestions')
    .select('*')
    .eq('id', parsed.data.suggestionId)
    .eq('status', 'proposed')
    .maybeSingle();
  if (!sugg) return { ok: false, error: 'not_found' };

  const r = await buildPackFromSuggestion(admin, sugg, { suggestedBy: 'ai' });
  if (!r.ok) return r;

  revalidatePath('/admin/stock');
  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true, slug: r.slug };
}

/** Écarter une suggestion (elle ne reviendra pas aujourd'hui). */
export async function dismissSuggestion(formData) {
  await requireStaff();
  const parsed = IdSchema.safeParse({ suggestionId: formData.get('suggestionId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  await admin
    .from('pack_suggestions')
    .update({ status: 'dismissed' })
    .eq('id', parsed.data.suggestionId)
    .eq('status', 'proposed');
  revalidatePath('/admin/stock');
  revalidatePath('/ops/stock');
  return { ok: true };
}

const PackIdSchema = z.object({ packId: z.string().uuid() });

/** Archiver un lot (retiré de la boutique). */
export async function archivePack(formData) {
  await requireStaff();
  const parsed = PackIdSchema.safeParse({ packId: formData.get('packId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  await admin.from('packs').update({ status: 'archived' }).eq('id', parsed.data.packId);
  revalidatePath('/admin/stock');
  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true };
}

const BulkSchema = z.object({ count: z.coerce.number().int().min(1).max(100) });

/** Génération EN MASSE depuis les meilleures suggestions (sans chevauchement de stock). */
export async function generatePacksBulk(formData) {
  await requireStaff();
  const parsed = BulkSchema.safeParse({ count: formData.get('count') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: suggestions } = await admin
    .from('pack_suggestions')
    .select('*')
    .eq('status', 'proposed')
    .order('compat_score', { ascending: false })
    .limit(parsed.data.count * 3);
  if (!suggestions?.length) return { ok: false, error: 'no_suggestions' };

  const used = new Set();
  const { data: existingP } = await admin.from('packs').select('title').eq('status', 'published');
  const usedTitles = new Set((existingP ?? []).map((p) => p.title?.fr).filter(Boolean));
  let created = 0;
  for (const sugg of suggestions) {
    if (created >= parsed.data.count) break;
    const ids = [sugg.hero_id, ...sugg.dormant_ids];
    if (ids.some((id) => used.has(id))) continue;
    const r = await buildPackFromSuggestion(admin, sugg, { suggestedBy: 'ai', index: created, usedTitles });
    if (r.ok) { ids.forEach((id) => used.add(id)); created++; }
  }

  revalidatePath('/admin/stock');
  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true, created, requested: parsed.data.count };
}

/**
 * COMPOSITION DES LOTS DU JOUR (manuel) — même mécanique que le cron 24 h :
 * classe le stock (proxy si jeune) → suggestions → archive les lots auto de la
 * veille → compose des lots frais avec noms IA. Renvoie un message pour l'UI.
 * Signature (prevState, formData) pour useActionState.
 */
export async function composeLotsNow(_prevState, _formData) {
  try {
    await requireStaff();
  } catch {
    return { ok: false, created: 0, message: 'Accès réservé au staff.' };
  }
  try {
    const admin = createAdminClient();
    const r = await rotateAndCompose(admin, { count: 5, classify: true, composeImage: true });
    revalidatePath('/admin/stock');
    revalidatePath('/ops/stock');
    revalidatePath('/');
    const n = r.created ?? 0;
    if (n > 0) {
      return {
        ok: true,
        created: n,
        message: `${n} lot${n > 1 ? 's' : ''} du jour composé${n > 1 ? 's' : ''} et publié${n > 1 ? 's' : ''}. Voir « Le cabinet » sur l'accueil.`,
      };
    }
    // 0 lot : diagnostic précis (produits publiés en stock vs total)
    const [{ count: publishedInStock }, { count: totalProducts }] = await Promise.all([
      admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published').gt('quantity', 0),
      admin.from('products').select('id', { count: 'exact', head: true }),
    ]);
    let message;
    if ((publishedInStock ?? 0) < 2) {
      message =
        (totalProducts ?? 0) >= 2
          ? `Aucun lot : seulement ${publishedInStock ?? 0} produit(s) PUBLIÉ(S) en stock (sur ${totalProducts} au total). Publie au moins 2 produits en stock (ils sont peut-être en brouillon), puis réessaie.`
          : `Aucun lot : il faut au moins 2 produits publiés et en stock pour composer un lot. Tu en as ${publishedInStock ?? 0}. Ajoute des produits, puis réessaie.`;
    } else {
      message = `Aucun lot composé malgré ${publishedInStock} produits en stock. Réessaie ; si ça persiste, signale-le.`;
    }
    return { ok: true, created: 0, message };
  } catch (e) {
    return { ok: false, created: 0, message: `Erreur pendant la composition : ${e?.message ?? 'inconnue'}.` };
  }
}

/**
 * Classification manuelle du stock (bouton « Classer maintenant »).
 * Classe hero/stable/dormant (vélocité, ou proxy vues si catalogue jeune),
 * puis génère les suggestions de lots.
 */
export async function classifyStockNow() {
  await requireStaff();
  const admin = createAdminClient();
  const { classifyStock, generatePackSuggestions } = await import('@/lib/packs/engine');
  const c = await classifyStock(admin);
  const packs = await generatePackSuggestions(admin);
  revalidatePath('/admin');
  revalidatePath('/admin/stock');
  return { ok: true, classified: c.classified, heroes: c.heroes, dormants: c.dormants, suggestions: packs.suggested, proxy: c.proxy };
}
