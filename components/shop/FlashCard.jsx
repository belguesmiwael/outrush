'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { localized } from '@/lib/i18n/dictionaries';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';
import { createClient } from '@/lib/supabase/client';
import CardActions from './CardActions';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

/**
 * Carte d'un produit en vente flash — home (rail) et /flash.
 * Style DISTINCT des cartes normales (aura vermillon, filet de tension).
 * Placement de badges fixe et élégant :
 *   - haut-gauche : "Dernière pièce" (rareté), place réservée, ne bouge jamais
 *   - haut-droite : badge FLASH
 *   - le sceau de remise est intégré à la ligne de prix (ne cache pas l'image)
 * Quick Look + panier au prix flash (CardActions).
 */
export default function FlashCard({ item, locale = 'fr', variant = 'grid', labels = {} }) {
  const cur = useCurrency();
  const p = item.product;
  const [remaining, setRemaining] = useState(item.remaining_qty);

  // Stock flash live
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`flashcard:${item.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flash_sale_items', filter: `id=eq.${item.id}` },
        (payload) => {
          const n = Number(payload.new?.remaining_qty);
          if (!Number.isNaN(n)) setRemaining(n);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [item.id]);

  if (!p) return null;

  const imgUrl = mediaUrl((p.images ?? [])[0]);
  const pct = p.market_price ? Math.round((1 - item.flash_price / p.market_price) * 100) : null;
  const lastPiece = remaining === 1;
  const soldOut = remaining < 1;
  const gaugePct = item.allocated_qty > 0 ? Math.max(0, Math.min(100, (remaining / item.allocated_qty) * 100)) : 0;

  const flashProduct = {
    ...p,
    outlet_price: item.flash_price,
    flash: { price: item.flash_price, remaining },
    quantity: remaining,
  };

  const wrapCls = variant === 'rail'
    ? 'card-flash group flex flex-col overflow-hidden snap-start shrink-0 w-52 sm:w-56'
    : 'card-flash group flex flex-col overflow-hidden rise-in';

  return (
    <div className={wrapCls}>
      <Link href={`/product/${p.slug}`} className="relative aspect-product overflow-hidden bg-app-surface-2 block">
        <div className="absolute inset-0 opacity-80 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 72% 62% at 50% 42%, oklch(62% 0.24 25 / 0.22), transparent 70%)' }} />
        {imgUrl ? (
          <img src={imgUrl} alt={localized(p.title, locale)} loading="lazy"
            className="relative w-full h-full object-contain p-3 transition-transform duration-[600ms] ease-out-expo group-hover:scale-105" />
        ) : (
          <div className="w-full h-full grid place-items-center text-app-muted font-display text-4xl select-none">O</div>
        )}

        {/* Haut-gauche : rareté (place réservée, hauteur fixe pour ne pas décaler) */}
        <div className="absolute top-2.5 left-2.5 z-10 min-h-[22px]">
          {soldOut ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-black/70 backdrop-blur text-app-muted">Épuisé</span>
          ) : lastPiece ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[color:var(--app-accent)]/90 text-white pulse-last backdrop-blur">Dernière pièce</span>
          ) : remaining <= 3 ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white num">Plus que {remaining}</span>
          ) : null}
        </div>

        {/* Haut-droite : badge FLASH (place fixe, ne pousse rien) */}
        <span className="flash-tag absolute top-2.5 right-2.5 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-white pulse-last" /> Flash
        </span>

        {/* Actions panier + quick look */}
        <CardActions product={flashProduct} quickLookPos="top-left" />
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
            {pct !== null ? <span className="seal text-[11px]">−{pct}%</span> : null}
          </div>
          {/* Jauge de stock flash */}
          <div>
            <div className="stock-gauge"><div style={{ width: `${gaugePct}%` }} /></div>
            <p className={`mt-1 text-[11px] ${lastPiece ? 'num-tension font-bold' : 'text-app-muted num'}`}>
              {soldOut ? (labels.left ? 'Épuisé' : 'Épuisé') : lastPiece ? (labels.lastPiece ?? 'Dernière pièce') : `${remaining} ${labels.left ?? 'restant'}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
