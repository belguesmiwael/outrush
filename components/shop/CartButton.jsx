'use client';
import { useCart } from '@/lib/cart/CartContext';

export default function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      className="relative ml-1 rounded-full px-3 py-1.5 border border-white/12 hover:border-app-accent hover:text-app-accent transition-colors duration-220"
      aria-label="Panier"
    >
      🛒
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-app-accent text-white text-[10px] font-bold">
          {count}
        </span>
      ) : null}
    </button>
  );
}
