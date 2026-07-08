'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { Gavel, Check } from 'lucide-react';
import { playGavel } from '@/lib/sound/gavel';

/**
 * LA CRIÉE — « Remporter ce lot » (packs uniquement).
 * Un lot = un pack. On ajoute au panier les VRAIS produits qui le composent
 * (product_id réels → checkout sûr), au prix du lot RÉPARTI proportionnellement
 * sur chaque pièce (le total panier ≈ le prix du lot, la remise est honorée).
 */
export default function RemporterLotButton({ items = [], packPrice, sumOutlet, inStock = true }) {
  const { add } = useCart();
  const [won, setWon] = useState(false);

  const ratio = sumOutlet > 0 ? Number(packPrice) / sumOutlet : 1;

  function onWin() {
    if (!inStock) return;
    items.forEach((it) => {
      const p = it.product;
      add(
        {
          id: p.id,
          slug: p.slug,
          title: p.title,
          brand: p.brand,
          images: p.images,
          outlet_price: Math.round(Number(p.outlet_price) * ratio * 100) / 100,
          currency: p.currency,
          quantity: p.quantity,
        },
        it.qty,
        { openDrawer: false }
      );
    });
    playGavel();
    setWon(true);
    setTimeout(() => setWon(false), 1600);
  }

  if (!inStock) {
    return (
      <p className="text-app-accent font-medium">Une pièce du lot vient de partir — lot indisponible.</p>
    );
  }

  return (
    <button
      onClick={onWin}
      className={`btn-hammer w-full text-lg py-4 ${won ? 'gavel-shake' : ''}`}
    >
      {won
        ? <span className="inline-flex items-center gap-2"><Check size={18} strokeWidth={2.5} /> Adjugé — le lot est à vous</span>
        : <span className="inline-flex items-center gap-2"><Gavel size={18} strokeWidth={2} /> Remporter ce lot</span>}
    </button>
  );
}
