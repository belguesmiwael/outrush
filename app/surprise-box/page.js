import Link from 'next/link';
import SurpriseBoxBuilder from '@/components/shop/SurpriseBoxBuilder';

export const dynamic = 'force-dynamic';

export default function SurpriseBoxPage() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5" style={{ background: 'oklch(16% 0.015 260 / 0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-display font-extrabold text-2xl tracking-tight">
            OUT<span className="text-app-accent">RUSH</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/rush" className="hover:text-app-accent transition-colors duration-120">Le Flux</Link>
            <Link href="/flash" className="hover:text-app-accent transition-colors duration-120">Flash</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎁</div>
          <h1 className="font-display font-extrabold text-4xl">Surprise Box</h1>
          <p className="text-app-muted max-w-md mx-auto">
            Choisissez un budget. L'IA compose une box mystère d'une valeur toujours supérieure
            à ce que vous payez. Chaque box est unique.
          </p>
        </div>
        <SurpriseBoxBuilder />
      </section>
    </main>
  );
}
