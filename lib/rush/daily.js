/**
 * OUTRUSH — Le flux vivant.
 * On ne vend pas un catalogue : on vend des opportunités qui disparaissent.
 * La sélection change chaque jour (déterministe par date) → chaque visite diffère.
 */

/** Graine du jour (UTC) — stable sur 24 h, tourne à minuit. */
export function dailySeed(date = new Date()) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

/** Hash déterministe d'une chaîne → entier positif. */
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // ∈ [0,1[
}

/** Rang pseudo-aléatoire mais stable d'un produit pour la journée. */
export function dailyRank(productId, seed = dailySeed()) {
  return hashStr(`${seed}:${productId}`);
}

/** Sélectionne les N produits du "Daily Rush" du jour. */
export function pickDailyRush(products, n = 8, seed = dailySeed()) {
  return [...(products ?? [])]
    .map((p) => ({ p, r: dailyRank(p.id, seed) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map((x) => x.p);
}

/**
 * Niveau d'urgence d'un produit selon son stock.
 * Retourne { level, label, tone } ou null si rien à signaler.
 */
export function scarcity(product) {
  const q = Number(product.quantity ?? 0);
  if (q <= 0) return { level: 'gone', label: 'Épuisé', tone: 'muted' };
  if (q === 1) return { level: 'last', label: 'Dernière pièce', tone: 'accent' };
  if (q <= 3) return { level: 'critical', label: `Plus que ${q}`, tone: 'accent' };
  if (q <= 8) return { level: 'low', label: `Bientôt épuisé`, tone: 'warm' };
  return null;
}

/** Secondes restantes jusqu'à la prochaine rotation (minuit UTC). */
export function secondsUntilRotation(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next - now) / 1000));
}
