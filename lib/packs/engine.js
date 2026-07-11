import 'server-only';

/**
 * OUTRUSH — Moteur de packs.
 * Marie les héros (qui se vendent) avec les dormants (qui pourrissent)
 * pour qu'aucun stock ne meure. Tourne dans le cron quotidien.
 */

const PACK_DISCOUNT_MIN = 0.1; // remise pack vs somme des prix outlet
const PACK_DISCOUNT_MAX = 0.2;

/** Racine de la branche catégorie (pour "même univers"). */
function categoryRoot(catId, catById) {
  let cur = catId ? catById.get(catId) : null;
  let guard = 0;
  while (cur?.parent_id && guard++ < 10) cur = catById.get(cur.parent_id);
  return cur?.id ?? null;
}

/**
 * Score de compatibilité héros ↔ dormant ∈ [0,1] :
 *  - même branche de catégorie (0.45) ou même univers (0.30)
 *  - cohérence de gamme de prix (jusqu'à 0.30)
 *  - même marque (bonus 0.15)
 *  - vélocité du héros (jusqu'à 0.10)
 * Pondéré par l'apprentissage (performances passées des règles gagnantes).
 */
function compatScore(hero, dormant, catById, weights) {
  let score = 0;
  const hRoot = categoryRoot(hero.category_id, catById);
  const dRoot = categoryRoot(dormant.category_id, catById);
  const hCat = catById.get(hero.category_id);
  const dCat = catById.get(dormant.category_id);

  const sameBranch = hRoot && hRoot === dRoot;
  const sameUniverse = hCat?.universe && hCat.universe === dCat?.universe;
  if (sameBranch) score += 0.45 * (weights.same_branch ?? 1);
  else if (sameUniverse) score += 0.3 * (weights.same_universe ?? 1);

  const hp = Number(hero.outlet_price);
  const dp = Number(dormant.outlet_price);
  if (hp > 0 && dp > 0) {
    const ratio = Math.min(hp, dp) / Math.max(hp, dp);
    // gamme cohérente : le dormant ne doit être ni dérisoire ni écrasant
    score += Math.min(0.3, ratio * 0.45) * (weights.price_coherence ?? 1);
  }

  if (hero.brand && hero.brand === dormant.brand) {
    score += 0.15 * (weights.same_brand ?? 1);
  }

  score += Math.min(0.1, Number(hero.velocity_14d) * 0.08);
  return Math.min(1, Math.round(score * 1000) / 1000);
}

/** Simulation prix & marge d'un pack héros + dormants. */
export function simulatePack(hero, dormants) {
  const items = [hero, ...dormants];
  const sumOutlet = items.reduce((s, p) => s + Number(p.outlet_price), 0);
  const sumMarket = items.reduce(
    (s, p) => s + Number(p.market_price ?? p.outlet_price),
    0
  );
  // Remise pack : 10 % de base, jusqu'à 20 % si les dormants pèsent lourd
  const dormantShare =
    dormants.reduce((s, p) => s + Number(p.outlet_price), 0) / Math.max(sumOutlet, 0.01);
  const discount =
    PACK_DISCOUNT_MIN + (PACK_DISCOUNT_MAX - PACK_DISCOUNT_MIN) * Math.min(1, dormantShare * 1.5);
  const packPrice = Math.round(sumOutlet * (1 - discount) * 100) / 100;
  return {
    sum_outlet: Math.round(sumOutlet * 100) / 100,
    sum_market: Math.round(sumMarket * 100) / 100,
    pack_price: packPrice,
    pack_discount_pct: Math.round(discount * 100),
    buyer_saving_vs_separate: Math.round((sumOutlet - packPrice) * 100) / 100,
    buyer_saving_vs_market: Math.round((sumMarket - packPrice) * 100) / 100,
  };
}

/** Poids d'apprentissage : renforce les règles des packs qui ont converti. */
export function learnWeights(packRows) {
  const weights = { same_branch: 1, same_universe: 1, price_coherence: 1, same_brand: 1 };
  const counts = { same_branch: 0, same_universe: 0, price_coherence: 0, same_brand: 0 };
  for (const pack of packRows ?? []) {
    const perf = pack.performance ?? {};
    const rules = perf.rules ?? {};
    const converted = Number(perf.conversions ?? 0) > 0;
    const factor = converted ? 1.15 : Number(perf.views ?? 0) > 20 ? 0.92 : 1;
    for (const rule of Object.keys(weights)) {
      if (rules[rule]) {
        weights[rule] *= factor;
        counts[rule]++;
      }
    }
  }
  // bornage : jamais d'emballement
  for (const k of Object.keys(weights)) {
    weights[k] = Math.min(1.6, Math.max(0.6, weights[k]));
  }
  return weights;
}

/**
 * Génère les top-3 suggestions par dormant → pack_suggestions (proposed).
 * Idempotent : purge d'abord les propositions non traitées.
 */
export async function generatePackSuggestions(admin) {
  const [{ data: products }, { data: categories }, { data: recentPacks }] = await Promise.all([
    admin
      .from('products')
      .select('id, title, brand, category_id, outlet_price, market_price, quantity, stock_class, velocity_14d')
      .eq('status', 'published')
      .gt('quantity', 0)
      .in('stock_class', ['hero', 'dormant'])
      .limit(3000),
    admin.from('categories').select('id, parent_id, universe'),
    admin
      .from('packs')
      .select('performance')
      .gte('created_at', new Date(Date.now() - 90 * 86400_000).toISOString())
      .limit(300),
  ]);

  const heroes = (products ?? []).filter((p) => p.stock_class === 'hero');
  const dormants = (products ?? []).filter((p) => p.stock_class === 'dormant');
  if (!heroes.length || !dormants.length) return { suggested: 0 };

  const catById = new Map((categories ?? []).map((c) => [c.id, c]));
  const weights = learnWeights(recentPacks);

  // repartir propre : les "proposed" d'hier sont remplacées
  await admin.from('pack_suggestions').delete().eq('status', 'proposed');

  const DORMANTS_PER_LOT = 3; // héros + 3 dormants = 4 produits minimum par lot
  const rows = [];
  for (const hero of heroes) {
    const ranked = dormants
      .map((d) => ({ d, score: compatScore(hero, d, catById, weights) }))
      .sort((a, b) => b.score - a.score);
    // seuil souple ; repli sur les meilleurs si le catalogue n'a pas de catégories
    let chosen = ranked.filter((r) => r.score >= 0.3).slice(0, DORMANTS_PER_LOT);
    if (chosen.length < DORMANTS_PER_LOT) chosen = ranked.slice(0, DORMANTS_PER_LOT);
    if (chosen.length < DORMANTS_PER_LOT) continue; // pas assez de dormants pour un lot de 4
    const dIds = chosen.map((c) => c.d.id);
    const avg = chosen.reduce((s, c) => s + c.score, 0) / chosen.length;
    rows.push({
      hero_id: hero.id,
      dormant_ids: dIds,
      compat_score: Math.round(avg * 1000) / 1000,
      margin_sim: simulatePack(hero, chosen.map((c) => c.d)),
      status: 'proposed',
    });
  }

  if (rows.length) {
    // insertion par lots de 200
    for (let i = 0; i < rows.length; i += 200) {
      await admin.from('pack_suggestions').insert(rows.slice(i, i + 200));
    }
  }
  return { suggested: rows.length };
}

/**
 * Boucle d'apprentissage J+14 : mesure la performance des packs publiés
 * (conversions via order_items) et la range dans packs.performance.
 */
export async function updatePackPerformance(admin) {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: packs } = await admin
    .from('packs')
    .select('id, performance, created_at')
    .eq('status', 'published')
    .gte('created_at', since)
    .limit(300);
  if (!packs?.length) return { updated: 0 };

  const packIds = packs.map((p) => p.id);
  const { data: sold } = await admin
    .from('order_items')
    .select('pack_id, qty, unit_price')
    .in('pack_id', packIds)
    .limit(5000);

  const byPack = new Map();
  (sold ?? []).forEach((r) => {
    const rec = byPack.get(r.pack_id) ?? { conversions: 0, revenue: 0 };
    rec.conversions += r.qty;
    rec.revenue += Number(r.unit_price) * r.qty;
    byPack.set(r.pack_id, rec);
  });

  let updated = 0;
  for (const pack of packs) {
    const rec = byPack.get(pack.id) ?? { conversions: 0, revenue: 0 };
    const performance = {
      ...(pack.performance ?? {}),
      conversions: rec.conversions,
      revenue: Math.round(rec.revenue * 100) / 100,
      measured_at: new Date().toISOString(),
    };
    const { error } = await admin.from('packs').update({ performance }).eq('id', pack.id);
    if (!error) updated++;
  }
  return { updated };
}

/**
 * Classification du stock : hero / stable / dormant.
 * - S'il existe un historique de ventes → par vélocité réelle (14/30 j).
 * - Catalogue JEUNE sans ventes → PROXY par vues (top 35% = hero, reste = dormant)
 *   pour qu'il y ait toujours un couple hero×dormant à marier.
 * Partagée par le cron ET le bouton manuel. Retourne des compteurs.
 */
export async function classifyStock(admin) {
  const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: products }, { data: sales }] = await Promise.all([
    admin.from('products').select('id, created_at, quantity, views').eq('status', 'published').gt('quantity', 0).limit(5000),
    admin.from('inventory_movements').select('product_id, delta, created_at')
      .in('reason', ['sale', 'flash_claim']).gte('created_at', since30).limit(50000),
  ]);

  const list = products ?? [];
  const soldBy = new Map();
  (sales ?? []).forEach((m) => {
    const rec = soldBy.get(m.product_id) ?? { d14: 0, d30: 0 };
    const units = Math.abs(m.delta);
    rec.d30 += units;
    if (m.created_at >= since14) rec.d14 += units;
    soldBy.set(m.product_id, rec);
  });

  const hasSalesHistory = (sales ?? []).length > 0;
  let heroes = 0, dormants = 0, updated = 0;

  if (hasSalesHistory) {
    for (const p of list) {
      const rec = soldBy.get(p.id) ?? { d14: 0, d30: 0 };
      const v14 = Math.round((rec.d14 / 14) * 1000) / 1000;
      const v30 = Math.round((rec.d30 / 30) * 1000) / 1000;
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400_000;
      let cls = 'new';
      if (ageDays > 3) {
        if (v14 >= 0.3) cls = 'hero';
        else if (v30 >= 0.05) cls = 'stable';
        else cls = 'dormant';
      }
      if (cls === 'hero') heroes++; else if (cls === 'dormant') dormants++;
      const { error } = await admin.from('products')
        .update({ velocity_14d: v14, velocity_30d: v30, stock_class: cls }).eq('id', p.id);
      if (!error) updated++;
    }
  } else {
    const sorted = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    const heroCount = Math.max(1, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.35)));
    for (let i = 0; i < sorted.length; i++) {
      const cls = i < heroCount ? 'hero' : 'dormant';
      if (cls === 'hero') heroes++; else dormants++;
      const { error } = await admin.from('products').update({ stock_class: cls }).eq('id', sorted[i].id);
      if (!error) updated++;
    }
  }

  // GARANTIE (site en préparation / lancement) : pour composer un lot il faut au
  // moins 1 héros ET 1 dormant. Si la classification par vélocité n'a produit ni
  // l'un ni l'autre (produits récents, aucune vente), on FORCE un split proxy
  // (top vues = héros, reste = dormant) — dès qu'il y a 2 produits publiés en stock.
  if ((heroes === 0 || dormants === 0) && list.length >= 2) {
    const sorted = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    const heroCount = Math.max(1, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.35)));
    heroes = 0; dormants = 0;
    for (let i = 0; i < sorted.length; i++) {
      const cls = i < heroCount ? 'hero' : 'dormant';
      if (cls === 'hero') heroes++; else dormants++;
      await admin.from('products').update({ stock_class: cls }).eq('id', sorted[i].id);
    }
  }

  return { classified: updated, heroes, dormants, forced_split: (heroes > 0 && dormants > 0) };
}
