'use client';
import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';
import CardActions from './CardActions';
import LiveStockGauge from './LiveStockGauge';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

/**
 * Carte d'un produit en vente flash — utilisée sur la home (rail) et /flash.
 * Image plein cadre + halo, sceau remise laiton, prix flash en tension,
 * jauge de stock live, Quick Look + ajout panier (CardActions).
 * `variant`: 'rail' (largeur fixe, scroll horizontal) ou 'grid' (pleine cellule).
 */
export default function FlashCard({ item, locale = 'fr', variant = 'grid', labels = {} }) {
  const cur = useCurrency();
  const p = item.product;
  if (!p) return null;

  const imgUrl = mediaUrl((p.images ?? [])[0]);
  const pct = p.market_price ? Math.round((1 - item.flash_price / p.market_price) * 100) : null;

  // Le produit pour le panier / quick look porte le PRIX FLASH
  const flashProduct = {
    ...p,
    outlet_price: item.flash_price,
    flash: { price: item.flash_price, remaining: item.remaining_qty },
    quantity: item.remaining_qty,
  };

  const wrapCls = variant === 'rail'
    ? 'card-premium group flex flex-col overflow-hidden snap-start shrink-0 w-52 sm:w-56'
    : 'card-premium rise-in group flex flex-col overflow-hidden';

  return (
    <div className={wrapCls}>
      <Link href={`/product/${p.slug}`} className="relative aspect-product overflow-hidden bg-app-surface-2 block">
        <div className="absolute inset-0 opacity-70 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, oklch(62% 0.24 25 / 0.18), transparent 70%)' }} />
        {imgUrl ? (
          <img src={imgUrl} alt={localized(p.title, locale)} loading="lazy"
            className="relative w-full h-full object-contain p-3 transition-transform duration-[600ms] ease-out-expo group-hover:scale-105" />
        ) : (
          <div className="w-full h-full grid place-items-center text-app-muted font-display text-4xl select-none">O</div>
        )}
        {pct !== null ? <span className="absolute bottom-2 left-2 seal text-xs z-10">−{pct}%</span> : null}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/50 backdrop-blur text-app-accent z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-app-accent pulse-last" /> Flash
        </span>
        {/* Actions panier + quick look (overlay au hover) */}
        <CardActions product={flashProduct} />
      </Link>
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {p.brand ? <p className="text-[10px] uppercase tracking-widest text-app-muted truncate">{p.brand}</p> : null}
        <Link href={`/product/${p.slug}`} className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.4em] hover:text-app-accent transition-colors duration-120">
          {localized(p.title, locale)}
        </Link>
        <div className="mt-auto space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            {p.market_price ? <s className="num text-app-muted text-xs">{displayMoney(p.market_price, cur)}</s> : null}
            <span className="num-tension text-lg font-semibold">{displayMoney(item.flash_price, cur)}</span>
          </div>
          <LiveStockGauge itemId={item.id} allocated={item.allocated_qty}
            initialRemaining={item.remaining_qty}
            label={{ lastPiece: labels.lastPiece ?? 'Dernière pièce', left: labels.left ?? 'restant' }} />
        </div>
      </div>
    </div>
  );
}
