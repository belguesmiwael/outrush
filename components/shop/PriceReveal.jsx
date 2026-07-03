import { formatPrice, discountPct } from '@/lib/utils';

export default function PriceReveal({ marketPrice, outletPrice, currency = 'USD', locale = 'fr', size = 'md' }) {
  const pct = discountPct(marketPrice, outletPrice);
  const big = size === 'lg';
  return (
    <div className="price-reveal flex items-baseline gap-3 flex-wrap">
      {marketPrice ? (
        <s className={`text-app-muted ${big ? 'text-lg' : 'text-sm'}`}>
          {formatPrice(marketPrice, currency, locale)}
        </s>
      ) : null}
      <span className={`font-display font-bold text-app-text ${big ? 'text-3xl' : 'text-xl'}`}>
        {formatPrice(outletPrice, currency, locale)}
      </span>
      {pct !== null ? <span className={`seal ${big ? 'text-base' : 'text-xs'}`}>−{pct}%</span> : null}
    </div>
  );
}
