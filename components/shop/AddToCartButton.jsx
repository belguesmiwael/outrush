'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { Check, ShoppingBag } from 'lucide-react';

export default function AddToCartButton({ product, className = '', label = 'Ajouter au panier' }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const soldOut = (product.quantity ?? 0) < 1;

  function onAdd() {
    if (soldOut) return;
    add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  if (soldOut) {
    return (
      <button disabled className={`btn-ghost w-full opacity-50 cursor-not-allowed ${className}`}>
        Épuisé
      </button>
    );
  }

  return (
    <button onClick={onAdd} className={`btn-rush w-full ${className}`}>
      {added ? <span className="inline-flex items-center gap-1.5"><Check size={16} strokeWidth={2.5} /> Ajouté au panier</span> : <span className="inline-flex items-center gap-1.5"><ShoppingBag size={16} strokeWidth={2} /> {label}</span>}
    </button>
  );
}
