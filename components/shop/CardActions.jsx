'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { useQuickLook } from '@/lib/quicklook/QuickLookContext';

/** Superposé sur la carte produit : quick look (hover) + ajout panier + qté au panier. */
export default function CardActions({ product }) {
  const { add, items } = useCart();
  const { open } = useQuickLook();
  const [pulse, setPulse] = useState(false);

  const inCart = items.find((i) => i.id === product.id)?.qty ?? 0;
  const soldOut = (product.quantity ?? 0) < 1;

  function onAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    add(product, 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
  }

  function onQuickLook(e) {
    e.preventDefault();
    e.stopPropagation();
    open(product);
  }

  return (
    <>
      {/* Quick look — apparaît au survol de l'image */}
      <button
        onClick={onQuickLook}
        className="absolute top-2.5 right-2.5 z-10 rounded-full glass px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-220 ease-out-expo"
      >
        👁 Aperçu
      </button>

      {/* Badge quantité déjà au panier */}
      {inCart > 0 ? (
        <span className="absolute bottom-2.5 right-2.5 z-10 min-w-6 h-6 px-1.5 grid place-items-center rounded-full bg-app-success text-black text-xs font-bold">
          {inCart} au panier
        </span>
      ) : null}

      {/* Bouton ajouter — glisse depuis le bas au survol */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-220 ease-out-expo">
        <button
          onClick={onAdd}
          disabled={soldOut}
          className={`w-full rounded-lg py-2 text-sm font-display font-bold transition-transform duration-120 active:scale-95 ${
            soldOut
              ? 'bg-black/60 text-white/50 cursor-not-allowed'
              : 'bg-app-accent text-white'
          } ${pulse ? 'scale-105' : ''}`}
        >
          {soldOut ? 'Épuisé' : pulse ? '✓ Ajouté' : '+ Panier'}
        </button>
      </div>
    </>
  );
}
