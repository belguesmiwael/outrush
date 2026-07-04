'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart/CartContext';
import { formatPrice } from '@/lib/utils';
import { localized } from '@/lib/i18n/dictionaries';

function mediaUrl(path) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}` : null;
}

export default function CartDrawer() {
  const { items, subtotal, count, open, setOpen, remove, setQty } = useCart();

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[61] h-dvh w-full max-w-md flex flex-col transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'oklch(16% 0.014 264)', boxShadow: '-20px 0 60px oklch(0% 0 0 / 0.5)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="font-display font-bold text-lg">Votre panier {count ? `(${count})` : ''}</h2>
          <button onClick={() => setOpen(false)} className="text-app-muted hover:text-app-text text-2xl leading-none">×</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div className="space-y-3">
              <div className="text-5xl opacity-30">🛒</div>
              <p className="text-app-muted">Votre panier est vide.</p>
              <button onClick={() => setOpen(false)} className="btn-ghost">Continuer la chasse</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((it) => {
                const img = mediaUrl(it.image);
                return (
                  <div key={it.id} className="flex gap-3 card-premium p-3">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-app-surface-2 shrink-0">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      {it.brand ? <p className="text-[10px] uppercase tracking-widest text-app-muted">{it.brand}</p> : null}
                      <p className="text-sm font-medium leading-snug line-clamp-2">{localized(it.title, 'fr')}</p>
                      <p className="text-app-accent font-display font-bold text-sm mt-1">{formatPrice(it.outlet_price, it.currency)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-white/10 rounded-lg">
                          <button onClick={() => setQty(it.id, it.qty - 1)} className="px-2 py-0.5 text-app-muted hover:text-app-text">−</button>
                          <span className="px-2 text-sm tabular-nums">{it.qty}</span>
                          <button onClick={() => setQty(it.id, it.qty + 1)} className="px-2 py-0.5 text-app-muted hover:text-app-text">+</button>
                        </div>
                        <button onClick={() => remove(it.id)} className="text-xs text-app-muted hover:text-app-accent ml-auto">Retirer</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-app-muted">Sous-total</span>
                <span className="font-display font-extrabold text-xl">{formatPrice(subtotal, items[0]?.currency ?? 'USD')}</span>
              </div>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn-rush w-full">
                Passer la commande →
              </Link>
              <p className="text-xs text-app-muted text-center">Paiement à la livraison disponible · Stock réservé au moment de la commande</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
