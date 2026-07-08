'use client';
import Link from 'next/link';
import HeroGame from './HeroGame';

/** Hero : la salle avant l'ouverture — espace de jeu « chinez le lot » + texte éditorial en surcouche. */
export default function Hero({ product, pct, products = [], locale = 'fr' }) {
  return (
    <section className="relative overflow-hidden border-b border-app-loot/10 min-h-[560px] md:min-h-[600px]">
      {/* Projecteur laiton en haut à gauche + braise en bas à droite (chaleur de salle) */}
      <div className="absolute -top-40 -left-32 w-[38rem] h-[38rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(78% 0.13 85 / 0.14), transparent 65%)' }} />
      <div className="absolute -bottom-40 right-0 w-[30rem] h-[30rem] rounded-full halo-live pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(68% 0.20 45 / 0.12), transparent 65%)', animationDelay: '2s' }} />

      {/* Espace de jeu : les lots tombent sous le projecteur */}
      <HeroGame products={products} locale={locale} />

      {/* Texte en surcouche, à gauche */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-16 md:py-24 pointer-events-none">
        <div className="space-y-6 max-w-xl pointer-events-auto">
          <p className="eyebrow eyebrow-hot inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-app-accent" />
            </span>
            La maison de ventes de l'invendu
          </p>
          <h1 className="display-hero text-5xl md:text-7xl" style={{ textShadow: '0 2px 30px oklch(12% 0.015 40 / 0.9)' }}>
            Chaque lot<br />
            attend son <span className="text-app-loot">marteau.</span>
          </h1>
          <p className="text-app-muted text-lg max-w-md leading-relaxed" style={{ textShadow: '0 1px 12px oklch(12% 0.015 40)' }}>
            Chinez les lots qui tombent sous le projecteur : chaque pièce touchée,
            c'est l'économie réelle que vous remportez en l'adjugeant chez OUTRUSH.
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link href="/rush" className="btn-hammer px-6 py-3.5 inline-flex">Entrer en salle</Link>
            {product ? (
              <Link href={`/product/${product.slug}`} className="btn-ghost">
                Le lot du jour {pct ? `— −${pct}%` : ''}
              </Link>
            ) : (
              <Link href="/flash" className="btn-ghost">La vacation en cours</Link>
            )}
          </div>
        </div>
      </div>

      {/* Bandeau du crieur */}
      <div className="relative z-20 border-t border-app-loot/12 py-3 overflow-hidden bg-app-bg/60 backdrop-blur-sm">
        <div className="marquee-track gap-12 text-sm text-app-muted uppercase tracking-widest">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0" aria-hidden={k === 1}>
              <span>Nouveaux lots chaque jour</span>
              <span>Prix marché vérifiés</span>
              <span>Lots mariés par la maison</span>
              <span>Vacations chronométrées</span>
              <span>Lot mystère scellé</span>
              <span>Pièce unique, jamais réassortie</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
