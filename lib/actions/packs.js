'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { composePackImage, generatePackNarrative } from '@/lib/packs/compose';
import { simulatePack } from '@/lib/packs/engine';
import { slugify } from '@/lib/utils';

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

const IdSchema = z.object({ suggestionId: z.string().uuid() });

/**
 * Création 1-clic depuis une suggestion : visuel composé + narratif IA
 * + page pack publiée. Prix pack recalculé SERVEUR (jamais reçu du client).
 */
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

  const ids = [sugg.hero_id, ...sugg.dormant_ids];
  const { data: products } = await admin
    .from('products')
    .select('id, title, brand, images, outlet_price, market_price, quantity, status')
    .in('id', ids);
  const hero = products?.find((p) => p.id === sugg.hero_id);
  const dormants = (products ?? []).filter((p) => sugg.dormant_ids.includes(p.id));
  if (!hero || dormants.length !== sugg.dormant_ids.length) {
    return { ok: false, error: 'products_missing' };
  }
  if ([hero, ...dormants].some((p) => p.status !== 'published' || p.quantity < 1)) {
    return { ok: false, error: 'out_of_stock' };
  }

  // Prix & marge : recalcul serveur au moment T (la simulation d'hier peut être périmée)
  const sim = simulatePack(hero, dormants);
  const titleFr = `${hero.brand ? hero.brand + ' · ' : ''}Pack ${
    (hero.title?.fr ?? '').split(' ').slice(0, 4).join(' ')
  } + ${dormants.length} pièce${dormants.length > 1 ? 's' : ''}`.trim();
  const slug = `${slugify(titleFr)}-${Date.now().toString(36)}`;

  const [composedImg, { narrative }] = await Promise.all([
    composePackImage(admin, [hero, ...dormants], slug),
    generatePackNarrative([hero, ...dormants], sim),
  ]);

  const { data: pack, error: packErr } = await admin
    .from('packs')
    .insert({
      slug,
      title: { fr: titleFr, en: titleFr, ar: titleFr },
      narrative,
      composed_img: composedImg,
      pack_price: sim.pack_price,
      status: 'published',
      suggested_by: 'ai',
      performance: {
        views: 0,
        conversions: 0,
        sim,
        rules: { same_branch: true, price_coherence: true },
        compat_score: Number(sugg.compat_score),
      },
    })
    .select('id')
    .single();
  if (packErr) return { ok: false, error: 'pack_insert_failed' };

  const items = [
    { pack_id: pack.id, product_id: hero.id, qty: 1, role: 'hero' },
    ...dormants.map((d) => ({ pack_id: pack.id, product_id: d.id, qty: 1, role: 'dormant' })),
  ];
  const { error: itemsErr } = await admin.from('pack_items').insert(items);
  if (itemsErr) {
    await admin.from('packs').delete().eq('id', pack.id);
    return { ok: false, error: 'items_insert_failed' };
  }

  await admin
    .from('pack_suggestions')
    .update({ status: 'accepted' })
    .eq('id', sugg.id);

  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true, slug };
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
  revalidatePath('/ops/stock');
  return { ok: true };
}

const PackIdSchema = z.object({ packId: z.string().uuid() });

/** Archiver un pack (retiré de la boutique). */
export async function archivePack(formData) {
  await requireStaff();
  const parsed = PackIdSchema.safeParse({ packId: formData.get('packId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  await admin.from('packs').update({ status: 'archived' }).eq('id', parsed.data.packId);
  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true };
}

const BulkSchema = z.object({ count: z.coerce.number().int().min(1).max(100) });

/**
 * Génération EN MASSE : crée jusqu'à N packs d'un coup à partir des meilleures
 * suggestions proposées (les plus compatibles d'abord). Chaque dormant n'est
 * utilisé qu'une fois pour éviter les doublons. Visuel + narratif en parallèle.
 */
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

  const usedProducts = new Set();
  const chosen = [];
  for (const s of suggestions) {
    if (chosen.length >= parsed.data.count) break;
    const ids = [s.hero_id, ...s.dormant_ids];
    if (ids.some((id) => usedProducts.has(id))) continue; // pas de chevauchement de stock
    ids.forEach((id) => usedProducts.add(id));
    chosen.push(s);
  }

  let created = 0;
  const errors = [];
  // Séquentiel léger pour ne pas saturer Storage/IA
  for (const sugg of chosen) {
    const ids = [sugg.hero_id, ...sugg.dormant_ids];
    const { data: products } = await admin
      .from('products')
      .select('id, title, brand, images, outlet_price, market_price, quantity, status')
      .in('id', ids);
    const hero = products?.find((p) => p.id === sugg.hero_id);
    const dormants = (products ?? []).filter((p) => sugg.dormant_ids.includes(p.id));
    if (!hero || dormants.length !== sugg.dormant_ids.length) continue;
    if ([hero, ...dormants].some((p) => p.status !== 'published' || p.quantity < 1)) continue;

    const sim = simulatePack(hero, dormants);
    const titleFr = `${hero.brand ? hero.brand + ' · ' : ''}Pack ${
      (hero.title?.fr ?? '').split(' ').slice(0, 4).join(' ')
    } + ${dormants.length}`.trim();
    const slug = `${slugify(titleFr)}-${Date.now().toString(36)}-${created}`;

    const [composedImg, { narrative }] = await Promise.all([
      composePackImage(admin, [hero, ...dormants], slug),
      generatePackNarrative([hero, ...dormants], sim),
    ]);

    const { data: pack, error: packErr } = await admin
      .from('packs')
      .insert({
        slug,
        title: { fr: titleFr, en: titleFr, ar: titleFr },
        narrative,
        composed_img: composedImg,
        pack_price: sim.pack_price,
        status: 'published',
        suggested_by: 'ai',
        performance: { views: 0, conversions: 0, sim, rules: { same_branch: true, price_coherence: true } },
      })
      .select('id')
      .single();
    if (packErr) {
      errors.push(sugg.id);
      continue;
    }
    const items = [
      { pack_id: pack.id, product_id: hero.id, qty: 1, role: 'hero' },
      ...dormants.map((d) => ({ pack_id: pack.id, product_id: d.id, qty: 1, role: 'dormant' })),
    ];
    await admin.from('pack_items').insert(items);
    await admin.from('pack_suggestions').update({ status: 'accepted' }).eq('id', sugg.id);
    created++;
  }

  revalidatePath('/ops/stock');
  revalidatePath('/');
  return { ok: true, created, requested: parsed.data.count };
}
