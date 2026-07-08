'use client';
import { useState, useRef } from 'react';
import { Eye, Gavel, Check } from 'lucide-react';
import { useCart } from '@/lib/cart/CartContext';
import { useQuickLook } from '@/lib/quicklook/QuickLookContext';
import { playGavel } from '@/lib/sound/gavel';
import SoldSeal from './SoldSeal';

/** Superposé sur la carte-lot : aperçu (survol) + « Remporter » + le coup de marteau. */
export default function CardActions({ product, quickLookPos = 'top-right' }) {
  const { add, items } = useCart();
  const { open } = useQuickLook();
  const [adjuge, setAdjuge] = useState(false); // affiche le cachet ADJUGÉ · À VOUS
  const timer = useRef(null);
  const qlCls = quickLookPos === 'top-left' ? 'top-2.5 left-2.5' : 'top-2.5 right-2.5';

  const inCart = items.find((i) => i.id === product.id)?.qty ?? 0;
  const soldOut = (product.quantity ?? 0) < 1;

  function onAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    add(product, 1);
    playGavel();            // opt-in : muet si le son de la salle n'est pas activé
    setAdjuge(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdjuge(false), 1100);
  }

  function onQuickLook(e) {
    e.preventDefault();
    e.stopPropagation();
    open(product);
  }

  return (
    <>
      {/* Aperçu — apparaît au survol de l'image */}
      <button
        onClick={onQuickLook}
        className={`absolute ${qlCls} z-20 rounded-full glass px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-220 ease-out-expo inline-flex items-center gap-1.5`}
      >
        <Eye size={14} strokeWidth={2} /> Aperçu
      </button>

      {/* Le coup de marteau : cachet ADJUGÉ · À VOUS qui s'abat + flash laiton */}
      {adjuge ? (
        <div className="absolute inset-0 z-30 grid place-items-center pointer-events-none">
          <div className="absolute inset-0 brass-flash" style={{ background: 'radial-gradient(ellipse at 50% 50%, oklch(78% 0.13 85 / 0.35), transparent 65%)' }} />
          <div className="gavel-shake">
            <SoldSeal variant="won" />
          </div>
        </div>
      ) : null}

      {/* Badge quantité déjà remportée */}
      {inCart > 0 ? (
        <span className="absolute bottom-2.5 right-2.5 z-10 min-w-6 h-6 px-1.5 grid place-items-center rounded-full bg-app-loot text-black text-xs font-bold num">
          {inCart}
        </span>
      ) : null}

      {/* Remporter — glisse depuis le bas au survol */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-220 ease-out-expo">
        <button
          onClick={onAdd}
          disabled={soldOut}
          className={`w-full rounded-lg py-2 text-sm font-display font-bold transition-transform duration-120 active:scale-95 inline-flex items-center justify-center gap-1.5 ${
            soldOut ? 'bg-black/60 text-white/50 cursor-not-allowed' : 'btn-hammer'
          }`}
        >
          {soldOut ? 'Adjugé' : adjuge ? <><Check size={15} strokeWidth={2.5} /> À vous</> : <><Gavel size={15} strokeWidth={2} /> Remporter</>}
        </button>
      </div>
    </>
  );
}
