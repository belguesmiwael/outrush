'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice, discountPct } from '@/lib/utils';
import { scarcity } from '@/lib/rush/daily';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

/** Flux vertical plein écran, snap par produit — la chasse en continu. */
export default function RushFeed({ products, locale = 'fr' }) {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className="h-dvh overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none' }}
    >
      {products.map((p, i) => {
        const img = mediaUrl((p.images ?? [])[0]);
        const pct = discountPct(p.market_price, p.outlet_price);
        const rare = scarcity(p);
        return (
          <section
            key={p.id}
            className="h-dvh snap-start relative flex items-end overflow-hidden"
          >
            {img ? (
              <>
                {/* Fond flouté de la même image — remplit sans bandes noires */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                {/* Image complète, adaptée à l'écran, sans perte de résolution */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={localized(p.title, locale)} className="absolute inset-0 w-full h-full object-contain" />
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center font-display text-8xl text-app-accent/20">O</div>
            )}
            {/* Dégradé lisibilité */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, oklch(10% 0.01 260 / 0.95) 0%, transparent 55%)' }} />

            {/* En-tête flux */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between">
              <Link href="/" className="font-display font-extrabold text-xl text-white">
                OUT<span className="text-app-accent">RUSH</span>
              </Link>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/70">Le flux · {i + 1}/{products.length}</span>
            </div>

            {/* Contenu */}
            <div className="relative z-10 p-6 pb-10 w-full space-y-3">
              <div className="flex items-center gap-2">
                {pct ? <span className="seal">−{pct}%</span> : null}
                {rare ? (
                  <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${rare.tone === 'accent' ? 'bg-app-accent text-white pulse-last' : 'bg-white/15 text-white'}`}>
                    {rare.label}
                  </span>
                ) : null}
              </div>
              {p.brand ? <p className="text-white/60 text-xs uppercase tracking-widest">{p.brand}</p> : null}
              <h2 className="font-display font-extrabold text-2xl text-white leading-tight max-w-md">
                {localized(p.title, locale)}
              </h2>
              <div className="flex items-baseline gap-3">
                {p.market_price ? (
                  <span className="text-white/50 line-through text-lg">{formatPrice(p.market_price, p.currency, locale)}</span>
                ) : null}
                <span className="font-display font-extrabold text-3xl text-app-accent">
                  {formatPrice(p.outlet_price, p.currency, locale)}
                </span>
              </div>
              <Link
                href={`/product/${p.slug}`}
                className="inline-block mt-2 rounded-xl px-8 py-3.5 font-display font-bold bg-app-accent text-white transition-transform duration-[220ms] hover:scale-[1.02] active:scale-[0.98]"
              >
                Saisir maintenant
              </Link>
            </div>

            {/* Indice de scroll */}
            {i === 0 ? (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-bounce">
                ↑ défilez ↑
              </div>
            ) : null}
          </section>
        );
      })}

      {/* Fin du flux */}
      <section className="h-dvh snap-start grid place-items-center bg-app-bg text-center p-6">
        <div className="space-y-4">
          <div className="font-display text-6xl text-app-accent opacity-40">⏱</div>
          <h2 className="font-display font-bold text-2xl">Vous avez tout vu pour aujourd'hui.</h2>
          <p className="text-app-muted">Le flux se renouvelle chaque jour. Revenez demain pour une nouvelle chasse.</p>
          <Link href="/" className="inline-block rounded-xl px-6 py-3 border border-white/10 hover:bg-app-surface transition-colors duration-120">
            Retour à l'accueil
          </Link>
        </div>
      </section>
    </div>
  );
}
