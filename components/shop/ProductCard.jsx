import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { scarcity } from '@/lib/rush/daily';
import PriceReveal from './PriceReveal';

export default function ProductCard({ product, locale = 'fr', index = 0 }) {
  const img = Array.isArray(product.images) ? product.images[0] : null;
  const imgUrl = img
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${img}`
    : null;
  const rare = scarcity(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card-premium rise-in block group"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="aspect-[4/5] bg-app-surface-2 relative overflow-hidden">
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
        {rare ? (
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full backdrop-blur ${
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
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-220 ease-out-expo pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, oklch(62% 0.24 25 / 0.15), transparent 60%)' }}
        />
      </div>
      <div className="p-4 space-y-2">
        {product.brand ? (
          <p className="text-xs uppercase tracking-widest text-app-muted">{product.brand}</p>
        ) : null}
        <h3 className="font-medium leading-snug line-clamp-2">{localized(product.title, locale)}</h3>
        <PriceReveal
          marketPrice={product.market_price}
          outletPrice={product.outlet_price}
          currency={product.currency}
          locale={locale}
        />
      </div>
    </Link>
  );
}
