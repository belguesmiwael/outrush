'use client';
import { discountPct } from '@/lib/utils';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';
import { useFlashLive } from '@/lib/flash/FlashLiveContext';

export default function PriceReveal({ productId, marketPrice, outletPrice, currency = 'USD', locale = 'fr', size = 'md' }) {
  const cur = useCurrency();
  const { map } = useFlashLive();
  const big = size === 'lg';

  // Prix flash live : si ce produit est en flash actif, il prime en temps réel
  const flash = productId ? map?.[productId] : null;
  const displayMarket = flash ? outletPrice : marketPrice;
  const displayOutlet = flash ? flash.price : outletPrice;
  const pct = discountPct(displayMarket, displayOutlet);

  return (
    <div className="price-reveal flex items-baseline gap-3 flex-wrap">
      {displayMarket ? (
        <s className={`num text-app-muted ${big ? 'text-lg' : 'text-sm'}`}>
          {displayMoney(displayMarket, cur)}
        </s>
      ) : null}
      <span className={`num font-semibold ${flash ? 'text-app-accent' : 'text-app-text'} ${big ? 'text-3xl' : 'text-xl'}`}>
        {displayMoney(displayOutlet, cur)}
      </span>
      {pct !== null ? <span className={`seal ${big ? 'text-base' : 'text-xs'}`}>−{pct}%</span> : null}
    </div>
  );
}
