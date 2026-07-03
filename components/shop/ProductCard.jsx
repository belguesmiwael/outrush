import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import PriceReveal from './PriceReveal';

export default function ProductCard({ product, locale = 'fr', index = 0 }) {
  const img = Array.isArray(product.images) ? product.images[0] : null;
  const imgUrl = img
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${img}`
    : null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card-hunt rise-in block overflow-hidden group"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="aspect-[4/5] bg-app-surface-2 relative overflow-hidden">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={localized(product.title, locale)}
            className="w-full h-full object-cover transition-transform duration-380 ease-out-expo group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-app-muted font-display text-4xl select-none">
            O
          </div>
        )}
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
