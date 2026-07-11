import 'server-only';
import { generatePackSuggestions, classifyStock } from './engine';
import { buildPackFromSuggestion } from './build';

/**
 * LA CRIÉE — le renouvellement quotidien de la salle.
 * 1) ARCHIVE les lots AUTO publiés précédents (suggested_by='ai_daily') — les
 *    packs manuels ('ai' 1-clic / 'manual') sont préservés. C'est la ROTATION :
 *    ce qui était là hier n'est plus là aujourd'hui (rareté véridique).
 * 2) (option) régénère les suggestions à partir de la classification courante.
 * 3) COMPOSE N lots frais du jour, avec un léger brassage parmi les meilleures
 *    suggestions pour varier d'un jour à l'autre, sans jamais réutiliser deux
 *    fois la même pièce de stock. Nom + narratif générés par l'IA.
 */
export async function rotateAndCompose(admin, { count = 4, classify = false, composeImage = true } = {}) {
  // 0) (option) classer le stock (proxy si jeune) + régénérer les suggestions —
  //    garantit qu'un couple hero×dormant existe, même sans historique de ventes.
  if (classify) {
    try {
      await classifyStock(admin);
      await generatePackSuggestions(admin);
    } catch { /* on continue avec l'existant */ }
  }

  // 1) Rotation : archiver les lots auto de la veille
  await admin
    .from('packs')
    .update({ status: 'archived' })
    .eq('status', 'published')
    .eq('suggested_by', 'ai_daily');

  // 3) Piocher les suggestions proposées
  const { data: suggestions } = await admin
    .from('pack_suggestions')
    .select('*')
    .eq('status', 'proposed')
    .order('compat_score', { ascending: false })
    .limit(count * 4);
  if (!suggestions?.length) return { ok: true, created: 0, archived: true, reason: 'no_suggestions' };

  // Léger brassage parmi les meilleures → variété jour après jour
  const pool = suggestions.slice(0, count * 3);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const used = new Set();
  // Unicité des noms : on amorce avec les lots déjà publiés (manuels conservés)
  const { data: existing } = await admin.from('packs').select('title').eq('status', 'published');
  const usedTitles = new Set((existing ?? []).map((p) => p.title?.fr).filter(Boolean));
  let created = 0;
  const errors = [];
  for (const sugg of pool) {
    if (created >= count) break;
    const ids = [sugg.hero_id, ...(sugg.dormant_ids ?? [])];
    if (ids.some((id) => used.has(id))) continue; // pas de chevauchement de stock
    const r = await buildPackFromSuggestion(admin, sugg, { suggestedBy: 'ai_daily', index: created, composeImage, usedTitles });
    if (r.ok) {
      ids.forEach((id) => used.add(id));
      created++;
    } else {
      errors.push(r.error);
    }
  }
  return { ok: true, created, archived: true, errors };
}
