'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuickLook } from '@/lib/quicklook/QuickLookContext';
import { useCart } from '@/lib/cart/CartContext';
import { localized } from '@/lib/i18n/dictionaries';
import { discountPct } from '@/lib/utils';
import Money from './Money';
import { scarcity } from '@/lib/rush/daily';
import LiveViewers from './LiveViewers';

function mediaUrl(path) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}` : null;
}

export default function QuickLookModal() {
  const { product, close } = useQuickLook();
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const images = Array.isArray(product.images) ? product.images : [];
  const pct = discountPct(product.market_price, product.outlet_price);
  const rare = scarcity(product);
  const inCart = items.find((i) => i.id === product.id)?.qty ?? 0;
  const soldOut = (product.quantity ?? 0) < 1;

  function onAdd() {
    if (soldOut) return;
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog">
      <div onClick={close} className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[reveal-up_0.2s_ease]" />
      <div className="relative w-full max-w-3xl max-h-[88dvh] overflow-y-auto card-premium rise-in in">
        <button onClick={close} className="absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full glass text-xl leading-none">×</button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="aspect-square md:aspect-auto bg-app-surface-2 relative">
            {mediaUrl(images[0]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(images[0])} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center font-display text-6xl text-app-accent/20">O</div>
            )}
            {pct ? <span className="seal absolute top-4 left-4">−{pct}%</span> : null}
          </div>

          {/* Détail */}
          <div className="p-6 space-y-4">
            {product.brand ? <p className="eyebrow" style={{ color: 'var(--app-text-muted)' }}>{product.brand}</p> : null}
            <h2 className="font-display font-extrabold text-2xl leading-tight">{localized(product.title, 'fr')}</h2>

            <div className="flex items-baseline gap-3">
              {product.market_price ? (
                <span className="text-app-muted line-through"><Money amount={product.market_price} /></span>
              ) : null}
              <span className="font-display font-extrabold text-3xl text-app-accent"><Money amount={product.outlet_price} /></span>
            </div>

            {product.description ? (
              <p className="text-app-muted text-sm leading-relaxed line-clamp-4">{localized(product.description, 'fr')}</p>
            ) : null}

            {/* Signaux */}
            <div className="flex flex-wrap gap-2 text-xs">
              {rare ? <span className="px-2.5 py-1 rounded-full bg-[color:var(--app-accent)]/15 text-app-accent font-medium">{rare.label}</span> : null}
              {product.views > 0 ? <span className="px-2.5 py-1 rounded-full bg-white/5 text-app-muted">👁 {product.views} vues</span> : null}
              <LiveViewers productId={product.id} />
            </div>

            {/* Quantité + panier */}
            {!soldOut ? (
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center border border-white/10 rounded-lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-app-muted hover:text-app-text">−</button>
                  <span className="px-3 tabular-nums">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.quantity ?? 99, q + 1))} className="px-3 py-2 text-app-muted hover:text-app-text">+</button>
                </div>
                <button onClick={onAdd} className="btn-rush flex-1">
                  {added ? '✓ Ajouté' : inCart ? `Ajouter (${inCart} au panier)` : 'Ajouter au panier'}
                </button>
              </div>
            ) : (
              <p className="text-app-accent font-medium">Épuisé</p>
            )}

            <Link href={`/product/${product.slug}`} onClick={close} className="block text-center text-sm text-app-muted hover:text-app-accent transition-colors duration-120">
              Voir la fiche complète →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
