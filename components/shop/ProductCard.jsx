import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { scarcity } from '@/lib/rush/daily';
import PriceReveal from './PriceReveal';
import FlashBadge from './FlashBadge';
import { Flame, ShoppingBag } from 'lucide-react';
import CardActions from './CardActions';

export default function ProductCard({ product, locale = 'fr', index = 0, sold = 0 }) {
  const img = Array.isArray(product.images) ? product.images[0] : null;
  const imgUrl = img
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${img}`
    : null;
  const rare = scarcity(product);
  const trending = Number(product.velocity_14d ?? 0) >= 3 || sold >= 3;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card-premium rise-in group flex flex-col h-full"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="aspect-[4/5] bg-app-surface-2 relative overflow-hidden shrink-0">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={localized(product.title, locale)}
            className="media-zoom w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-app-muted font-display text-4xl select-none">
            O
          </div>
        )}

        {/* Rareté / tendance — TOUJOURS en haut à gauche (place fixe) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 items-start">
          {rare ? (
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full backdrop-blur ${
                rare.tone === 'accent'
                  ? 'bg-[color:var(--app-accent)]/90 text-white'
                  : rare.tone === 'warm'
                    ? 'bg-black/60 text-white'
                    : 'bg-black/70 text-app-muted'
              } ${rare.level === 'last' ? 'pulse-last' : ''}`}
            >
              {rare.label}
            </span>
          ) : null}
          {trending ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 backdrop-blur text-app-accent">
              <Flame size={11} strokeWidth={2.5} className="inline -mt-0.5" /> Tendance
            </span>
          ) : null}
        </div>
        {/* Flash — en haut à DROITE, ne déplace jamais la rareté */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {product.flash ? <FlashBadge force /> : <FlashBadge productId={product.id} />}
        </div>

        <CardActions product={product} />

        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-220 ease-out-expo pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, oklch(62% 0.24 25 / 0.15), transparent 60%)' }}
        />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <p className="text-xs uppercase tracking-widest text-app-muted h-4 truncate">{product.brand ?? '\u00A0'}</p>
        <h3 className="font-medium leading-snug line-clamp-2 min-h-[2.6em]">{localized(product.title, locale)}</h3>
        <div className="mt-auto pt-1 space-y-1.5">
          <PriceReveal
            productId={product.id}
            marketPrice={product.flash ? product.outlet_price : product.market_price}
            outletPrice={product.flash ? product.flash.price : product.outlet_price}
            currency={product.currency}
            locale={locale}
          />
          {sold > 0 ? (
            <p className="text-[11px] text-app-muted"><ShoppingBag size={12} strokeWidth={2} className="inline -mt-0.5 mr-1" /><span className="num">{sold}</span> vendu{sold > 1 ? 's' : ''} aujourd'hui</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
