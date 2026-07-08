'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { Check, Gavel } from 'lucide-react';
import { playGavel } from '@/lib/sound/gavel';

// LA CRIÉE — le CTA d'acquisition sur la fiche : « Remporter ce lot ».
// Au succès : le marteau tombe (secousse sèche) + « Adjugé, à vous » + son opt-in.
export default function AddToCartButton({ product, className = '', label = 'Remporter ce lot' }) {
  const { add } = useCart();
  const [won, setWon] = useState(false);

  const soldOut = (product.quantity ?? 0) < 1;

  function onAdd() {
    if (soldOut) return;
    add(product, 1);
    playGavel();
    setWon(true);
    setTimeout(() => setWon(false), 1400);
  }

  if (soldOut) {
    return (
      <button disabled className={`btn-ghost w-full opacity-60 cursor-not-allowed ${className}`}>
        Adjugé · vendu
      </button>
    );
  }

  return (
    <button onClick={onAdd} className={`btn-hammer w-full py-3.5 px-6 ${won ? 'gavel-shake' : ''} ${className}`}>
      {won
        ? <span className="inline-flex items-center gap-1.5"><Check size={16} strokeWidth={2.5} /> Adjugé, à vous</span>
        : <span className="inline-flex items-center gap-1.5"><Gavel size={16} strokeWidth={2} /> {label}</span>}
    </button>
  );
}
