import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';

export default function SiteHeader({ categories = [], locale = 'fr' }) {
  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-display font-extrabold text-2xl tracking-tight shrink-0">
            OUT<span className="text-app-accent">RUSH</span>
          </Link>
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="w-full flex items-center gap-2 rounded-full bg-white/5 border border-white/8 px-4 py-2 text-sm text-app-muted hover:border-white/15 transition-colors duration-220">
              <span className="opacity-60">⌕</span>
              <span>Cherchez une marque, un produit…</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm shrink-0">
            <Link href="/rush" className="px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220">Le Flux</Link>
            <Link href="/flash" className="px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220">Flash</Link>
            <Link href="/surprise-box" className="px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220 hidden sm:block">Box</Link>
            <Link href="/login" className="ml-1 rounded-full px-4 py-1.5 border border-white/12 hover:border-app-accent hover:text-app-accent transition-colors duration-220">Compte</Link>
          </nav>
        </div>
        {categories.length ? (
          <div className="border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar py-2 text-sm">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="px-3 py-1.5 rounded-full whitespace-nowrap text-app-muted hover:text-app-text hover:bg-white/5 transition-colors duration-220"
                >
                  {localized(c.name, locale)}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
