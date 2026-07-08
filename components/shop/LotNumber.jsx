// LA CRIÉE — le № de lot : transforme « produit » en « lot catalogué ».
// Plaque parchemin à filet laiton (.lot-plaque). Server-safe (aucun hook).
// Le numéro est DÉTERMINISTE (dérivé de l'id/slug) : stable d'un rendu à l'autre,
// pas de faux aléatoire, cohérent entre serveur et client — zéro hydration mismatch.

function lotNo(seed) {
  const s = String(seed ?? '');
  if (!s) return '0001';
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 4 chiffres, 0100–9999 (évite les 00xx qui « sonnent » vides)
  const n = 100 + (Math.abs(h) % 9900);
  return String(n).padStart(4, '0');
}

export default function LotNumber({ product, className = '' }) {
  const n = product?.lot_no ?? lotNo(product?.id ?? product?.slug);
  return (
    <span className={`lot-plaque ${className}`} aria-label={`Lot numéro ${n}`}>
      <span className="lot-hash" aria-hidden="true">№</span>
      {n}
    </span>
  );
}

export { lotNo };
