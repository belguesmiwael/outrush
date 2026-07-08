'use client';
import { useEffect, useState } from 'react';
import { discountPct } from '@/lib/utils';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';
import { useFlashLive } from '@/lib/flash/FlashLiveContext';
import { playReveal } from '@/lib/sound/gavel';

/**
 * LA CRIÉE — « Révélation du lot ».
 * Le prix est APPELÉ en escalade : marché (barré) → OUTRUSH (barré, si flash)
 * → au marteau (ember), chaque palier atterrissant en cascade. Le dernier
 * palier joue une cloche douce (opt-in). Flash-live-aware (useFlashLive).
 */
export default function LotReveal({ productId, marketPrice, outletPrice, flashPrice = null, currency = 'USD' }) {
  const cur = useCurrency();
  const { map } = useFlashLive();
  const [revealed, setRevealed] = useState(false);

  // Prix flash live (prime sur la valeur serveur si le drop bouge en direct)
  const liveFlash = productId ? map?.[productId]?.price : null;
  const marteau = liveFlash ?? flashPrice ?? outletPrice;
  const isFlash = (liveFlash ?? flashPrice) != null;

  // Paliers de l'escalade (on retire ceux sans valeur)
  const steps = [];
  if (marketPrice) steps.push({ k: 'Prix marché', v: marketPrice, struck: true });
  if (isFlash && outletPrice) steps.push({ k: 'Prix OUTRUSH', v: outletPrice, struck: true });
  steps.push({ k: 'Au marteau', v: marteau, final: true });

  const pct = discountPct(marketPrice ?? outletPrice, marteau);
  const stepMs = 380;
  const landAt = (steps.length - 1) * stepMs;

  useEffect(() => {
    setRevealed(true);
    const reduced = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = setTimeout(() => playReveal(), landAt + 40);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, marteau]);

  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div
          key={s.k}
          className={`flex items-baseline gap-3 flex-wrap ${revealed ? 'escalade-in' : 'opacity-0'}`}
          style={{ animationDelay: `${i * stepMs}ms` }}
        >
          <span className={`eyebrow ${s.final ? 'eyebrow-hot' : ''} w-28 shrink-0`}>{s.k}</span>
          {s.final ? (
            <>
              <span className="marteau-price text-4xl md:text-5xl loot-drop">{displayMoney(s.v, cur)}</span>
              {pct !== null ? <span className="seal text-base">−{pct}%</span> : null}
            </>
          ) : (
            <s className="num text-app-muted text-lg">{displayMoney(s.v, cur)}</s>
          )}
        </div>
      ))}
    </div>
  );
}
