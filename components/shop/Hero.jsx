'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';
import HeroGame from './HeroGame';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

/** Hero éditorial plein cadre : titre massif + spotlight produit flottant. */
export default function Hero({ product, pct, locale = 'fr' }) {
  const wrapRef = useRef(null);
  const artRef = useRef(null);

  // Parallaxe très douce au mouvement de souris (desktop)
  function onMove(e) {
    const el = wrapRef.current;
    const art = artRef.current;
    if (!el || !art) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / r.width;
    const dy = (e.clientY - r.top - r.height / 2) / r.height;
    art.style.transform = `translate(${dx * -12}px, ${dy * -12}px)`;
  }
  function onLeave() {
    if (artRef.current) artRef.current.style.transform = 'translate(0,0)';
  }

  const img = mediaUrl((product?.images ?? [])[0]);

  return (
    <section
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden border-b border-white/5"
    >
      {/* Halos vivants */}
      <div className="absolute -top-40 -left-32 w-[38rem] h-[38rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(62% 0.24 25 / 0.16), transparent 65%)' }} />
      <div className="absolute -bottom-40 right-0 w-[30rem] h-[30rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(55% 0.14 300 / 0.10), transparent 65%)', animationDelay: '2s' }} />

      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <p className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-app-accent" />
            </span>
            Marketplace outlet · piloté par l'IA
          </p>
          <h1 className="display-hero text-5xl md:text-7xl">
            Chaque visite<br />
            est une <span className="text-app-accent">chasse.</span>
          </h1>
          <p className="text-app-muted text-lg max-w-md leading-relaxed">
            Invendus et fins de série des grandes marques. Prix réels vérifiés,
            remises scellées. Ce que vous voyez peut disparaître dans l'heure.
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link href="/rush" className="btn-rush">▶ Entrer dans le Flux</Link>
            {product ? (
              <Link href={`/product/${product.slug}`} className="btn-ghost">
                L'affaire du jour {pct ? `· −${pct}%` : ''}
              </Link>
            ) : (
              <Link href="/flash" className="btn-ghost">Les ventes flash</Link>
            )}
          </div>
          <div className="flex items-center gap-6 pt-4 text-sm text-app-muted">
            <span>✓ Prix vérifiés multi-sources</span>
            <span className="hidden sm:inline">✓ Checkout mondial</span>
          </div>
        </div>

        {/* Zone de jeu interactive — chasse aux économies */}
        <div className="relative">
          <HeroGame />
        </div>
      </div>

      {/* Bandeau valeurs défilant */}
      <div className="relative border-t border-white/5 py-3 overflow-hidden">
        <div className="marquee-track gap-12 text-sm text-app-muted uppercase tracking-widest">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              <span>◆ Nouveaux drops chaque jour</span>
              <span>◆ Prix marché vérifiés</span>
              <span>◆ Packs générés par IA</span>
              <span>◆ Ventes flash chronométrées</span>
              <span>◆ Surprise Box mystère</span>
              <span>◆ Stock limité, jamais réassorti</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
