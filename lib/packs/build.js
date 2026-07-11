import 'server-only';
import { composePackImage, generatePackCopy } from './compose';
import { simulatePack } from './engine';
import { slugify } from '@/lib/utils';

const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Rend un nom de lot unique dans `used` (marque du héros, puis numéro romain). */
function uniqueTitle(title, used, hero) {
  if (!used || !title?.fr || !used.has(title.fr)) return title;
  const tag = hero?.brand && !title.fr.includes(hero.brand) ? ` — ${hero.brand}` : '';
  let n = 2;
  let deltaCandidate = tag;
  let candidateFr = `${title.fr}${deltaCandidate}`;
  while (used.has(candidateFr)) {
    deltaCandidate = `${tag} · ${ROMAN[Math.min(n - 1, ROMAN.length - 1)] || n}`;
    candidateFr = `${title.fr}${deltaCandidate}`;
    n++;
  }
  return {
    fr: `${title.fr}${deltaCandidate}`,
    en: `${title.en ?? title.fr}${deltaCandidate}`,
    ar: `${title.ar ?? title.fr}${deltaCandidate}`,
  };
}

/**
 * Construit un LOT publié à partir d'une suggestion : recalcule prix/marge au
 * moment T, génère nom + narratif (IA), visuel composé (optionnel), insère le
 * pack + ses items, et marque la suggestion « accepted ».
 * @param usedTitles Set des noms déjà pris (unicité garantie), muté au passage.
 */
export async function buildPackFromSuggestion(admin, sugg, { suggestedBy = 'ai', index = 0, composeImage = true, usedTitles = null } = {}) {
  const ids = [sugg.hero_id, ...(sugg.dormant_ids ?? [])];
  const { data: products } = await admin
    .from('products')
    .select('id, title, brand, images, outlet_price, market_price, quantity, status')
    .in('id', ids);
  const hero = products?.find((p) => p.id === sugg.hero_id);
  const dormants = (products ?? []).filter((p) => (sugg.dormant_ids ?? []).includes(p.id));
  if (!hero || dormants.length !== (sugg.dormant_ids ?? []).length) return { ok: false, error: 'products_missing' };
  if ([hero, ...dormants].some((p) => p.status !== 'published' || p.quantity < 1)) return { ok: false, error: 'out_of_stock' };

  const members = [hero, ...dormants];
  const sim = simulatePack(hero, dormants);
  const fallbackTitle = `${hero.brand ? hero.brand + ' · ' : ''}Lot ${
    (hero.title?.fr ?? '').split(' ').slice(0, 4).join(' ')
  } + ${dormants.length}`.trim();
  const slug = `${slugify(fallbackTitle) || 'lot'}-${Date.now().toString(36)}-${index}`;

  const [composedImg, copy] = await Promise.all([
    composeImage ? composePackImage(admin, members, slug) : Promise.resolve(null),
    generatePackCopy(members, sim, { fallbackTitle }),
  ]);

  // Unicité du nom (évite deux lots au même titre)
  const title = uniqueTitle(copy.title, usedTitles, hero);
  if (usedTitles && title?.fr) usedTitles.add(title.fr);

  const { data: pack, error: packErr } = await admin
    .from('packs')
    .insert({
      slug,
      title,
      narrative: copy.narrative,
      composed_img: composedImg,
      pack_price: sim.pack_price,
      status: 'published',
      suggested_by: suggestedBy,
      performance: {
        views: 0,
        conversions: 0,
        sim,
        compat_score: Number(sugg.compat_score ?? 0),
        copy_cost: copy.cost ?? 0,
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
  await admin.from('pack_suggestions').update({ status: 'accepted' }).eq('id', sugg.id);
  return { ok: true, slug, packId: pack.id };
}
