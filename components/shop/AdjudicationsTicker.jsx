'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gavel } from 'lucide-react';

/**
 * LA CRIÉE — « Dernières adjudications ».
 * Fait défiler de VRAIS lots vendus sur 24 h (passés en props depuis le serveur).
 * Aucun nom de client, aucun faux timestamp, aucune personne inventée :
 * uniquement des lots réellement adjugés. Si rien n'a été vendu, ne s'affiche pas.
 *
 * @param lots [{ slug, title, pct }]
 */
export default function AdjudicationsTicker({ lots = [] }) {
  const [i, setI] = useState(0);
  const usable = lots.filter((l) => l && l.title);

  useEffect(() => {
    if (usable.length < 2) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = setInterval(() => setI((v) => (v + 1) % usable.length), 3200);
    return () => clearInterval(id);
  }, [usable.length]);

  if (!usable.length) return null;
  const lot = usable[i % usable.length];

  return (
    <Link href={`/product/${lot.slug}`} className="adjuge-pill hover:border-app-loot/50 transition-colors duration-220">
      <span className="dot" />
      <Gavel size={14} strokeWidth={2} className="text-app-loot shrink-0" />
      <span key={i} className="adjuge-in text-sm text-app-text truncate max-w-[16rem]">
        <span className="text-app-muted">Récemment adjugé — </span>
        {lot.title}
        {lot.pct ? <span className="num-loot"> · −{lot.pct}%</span> : null}
      </span>
    </Link>
  );
}
