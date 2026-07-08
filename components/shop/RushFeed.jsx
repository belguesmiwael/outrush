'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { discountPct } from '@/lib/utils';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';
import { scarcity } from '@/lib/rush/daily';
import { ArrowLeft, Gavel } from 'lucide-react';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

/**
 * LA CRIÉE — Le Flux : les lots passent sous le projecteur, un par un.
 * SEULE l'image défile (snap image-par-image). Le nom OUTRUSH (haut-droite),
 * le compteur et le cartouche d'infos (titre, prix, bouton) sont FIXES : à
 * chaque image, leurs données changent instantanément — ça donne la vie.
 */
export default function RushFeed({ products, locale = 'fr' }) {
  const cur = useCurrency();
  const [active, setActive] = useState(0);
  const slideRefs = useRef([]);
  const total = products.length;

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.55) {
            const idx = Number(e.target.getAttribute('data-idx'));
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { threshold: [0.55, 0.8] }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [total]);

  const atEnd = active >= total;
  const p = atEnd ? null : products[active];
  const pct = p ? discountPct(p.market_price, p.outlet_price) : null;
  const rare = p ? scarcity(p) : null;

  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {/* SCROLLER : uniquement les images, snap image-par-image */}
      <div className="h-dvh overflow-y-scroll snap-y snap-mandatory no-scrollbar">
        {products.map((prod, i) => {
          const img = mediaUrl((prod.images ?? [])[0]);
          return (
            <section
              key={prod.id}
              data-idx={i}
              ref={(el) => (slideRefs.current[i] = el)}
              className="h-dvh snap-start relative overflow-hidden"
            >
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-35" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={localized(prod.title, locale)} className="absolute inset-0 w-full h-full object-contain" />
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center font-display text-8xl text-app-loot/20">O</div>
              )}
              {/* Voile de lisibilité (bas + tenture latérale) */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, oklch(8% 0.01 40 / 0.96) 0%, transparent 48%)' }} />
            </section>
          );
        })}

        {/* Fin du flux */}
        <section
          data-idx={total}
          ref={(el) => (slideRefs.current[total] = el)}
          className="h-dvh snap-start grid place-items-center bg-app-bg text-center p-6"
        >
          <div className="space-y-4">
            <Gavel size={52} strokeWidth={1.3} className="mx-auto text-app-loot opacity-45" />
            <h2 className="display-hero text-3xl">La vacation du jour est passée.</h2>
            <p className="text-app-muted">Le catalogue se renouvelle chaque nuit. Revenez demain pour de nouveaux lots.</p>
            <Link href="/" className="btn-hammer px-6 py-3 inline-flex mt-1">Retour à l'accueil</Link>
          </div>
        </section>
      </div>

      {/* ══ CHROME FIXE (ne défile jamais) ══ */}
      <div className="pointer-events-none fixed inset-0 z-20">
        {/* Barre du haut : retour (gauche) + OUTRUSH FIXE (droite) */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between safe-t">
          <Link href="/" className="pointer-events-auto inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors duration-120">
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <span className="font-display font-extrabold text-lg text-white tracking-[-0.03em]">
            OUT<span className="text-app-loot">RUSH</span>
          </span>
        </div>

        {/* Compteur (fixe) */}
        <div className="absolute top-16 right-4">
          <span className="lot-plaque">{Math.min(active + 1, total)} / {total}</span>
        </div>

        {/* Cartouche d'infos FIXE — change instantanément à chaque image */}
        {p ? (
          <div className="absolute bottom-0 inset-x-0 p-6 pb-10 safe-b">
            <div key={active} className="escalade-in max-w-md space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {pct ? <span className="seal">−{pct}%</span> : null}
                {rare ? (
                  <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${rare.tone === 'accent' ? 'bg-app-accent text-white pulse-last' : 'bg-white/15 text-white'}`}>
                    {rare.label}
                  </span>
                ) : null}
              </div>
              {p.brand ? <p className="text-white/60 text-xs uppercase tracking-widest">{p.brand}</p> : null}
              <h2 className="display-hero text-2xl md:text-3xl text-white leading-tight">
                {localized(p.title, locale)}
              </h2>
              <div className="flex items-baseline gap-3">
                {p.market_price ? (
                  <span className="num text-white/50 line-through text-lg">{displayMoney(p.market_price, cur)}</span>
                ) : null}
                <span className="marteau-price text-3xl md:text-4xl">{displayMoney(p.outlet_price, cur)}</span>
              </div>
              <Link href={`/product/${p.slug}`} className="pointer-events-auto btn-hammer px-8 py-3.5 inline-flex mt-1">
                <Gavel size={16} strokeWidth={2} /> Remporter
              </Link>
            </div>
          </div>
        ) : null}

        {/* Indice de défilement (première image) */}
        {active === 0 ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-bounce">↑</div>
        ) : null}
      </div>
    </div>
  );
}
