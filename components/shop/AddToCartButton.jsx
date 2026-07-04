'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';

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
      {added ? '✓ Ajouté au panier' : label}
    </button>
  );
}
