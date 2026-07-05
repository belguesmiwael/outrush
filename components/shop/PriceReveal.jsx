'use client';
import { discountPct } from '@/lib/utils';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';

export default function PriceReveal({ marketPrice, outletPrice, currency = 'USD', locale = 'fr', size = 'md' }) {
  const cur = useCurrency();
  const pct = discountPct(marketPrice, outletPrice);
  const big = size === 'lg';
  return (
    <div className="price-reveal flex items-baseline gap-3 flex-wrap">
      {marketPrice ? (
        <s className={`num text-app-muted ${big ? 'text-lg' : 'text-sm'}`}>
          {displayMoney(marketPrice, cur)}
        </s>
      ) : null}
      <span className={`num font-semibold text-app-text ${big ? 'text-3xl' : 'text-xl'}`}>
        {displayMoney(outletPrice, cur)}
      </span>
      {pct !== null ? <span className={`seal ${big ? 'text-base' : 'text-xs'}`}>−{pct}%</span> : null}
    </div>
  );
}
