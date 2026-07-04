'use client';
import Link from 'next/link';
import HeroGame from './HeroGame';

/** Hero : espace de jeu plein-section (plafond→sol) + texte editorial en surcouche. */
export default function Hero({ product, pct, products = [], locale = 'fr' }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5 min-h-[560px] md:min-h-[600px]">
      <div className="absolute -top-40 -left-32 w-[38rem] h-[38rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(62% 0.24 25 / 0.16), transparent 65%)' }} />
      <div className="absolute -bottom-40 right-0 w-[30rem] h-[30rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(55% 0.14 300 / 0.10), transparent 65%)', animationDelay: '2s' }} />

      {/* Espace de jeu : occupe toute la section (plafond en haut, sol en bas) */}
      <HeroGame products={products} locale={locale} />

      {/* Texte en surcouche, a gauche */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-16 md:py-24 pointer-events-none">
        <div className="space-y-6 max-w-xl pointer-events-auto">
          <p className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-app-accent" />
            </span>
            Marketplace outlet - pilote par l'IA
          </p>
          <h1 className="display-hero text-5xl md:text-7xl" style={{ textShadow: '0 2px 30px oklch(14% 0.012 264 / 0.9)' }}>
            Chaque visite<br />
            est une <span className="text-app-accent">chasse.</span>
          </h1>
          <p className="text-app-muted text-lg max-w-md leading-relaxed" style={{ textShadow: '0 1px 12px oklch(14% 0.012 264)' }}>
            Visez les produits qui tombent : chaque cible touchee, c'est l'economie
            reelle que vous feriez en l'achetant chez OUTRUSH.
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link href="/rush" className="btn-rush">Entrer dans le Flux</Link>
            {product ? (
              <Link href={`/product/${product.slug}`} className="btn-ghost">
                L'affaire du jour {pct ? `- -${pct}%` : ''}
              </Link>
            ) : (
              <Link href="/flash" className="btn-ghost">Les ventes flash</Link>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-20 border-t border-white/5 py-3 overflow-hidden bg-app-bg/60 backdrop-blur-sm">
        <div className="marquee-track gap-12 text-sm text-app-muted uppercase tracking-widest">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              <span>Nouveaux drops chaque jour</span>
              <span>Prix marche verifies</span>
              <span>Packs generes par IA</span>
              <span>Ventes flash chronometrees</span>
              <span>Surprise Box mystere</span>
              <span>Stock limite, jamais reassorti</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
