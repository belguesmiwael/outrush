import Link from 'next/link';
import { Search, User } from 'lucide-react';
import { localized } from '@/lib/i18n/dictionaries';
import CartButton from './CartButton';

export default function SiteHeader({ categories = [], locale = 'fr' }) {
  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent" />
            </span>
            <span className="font-display font-extrabold text-2xl tracking-[-0.04em]">
              OUT<span className="text-app-accent">RUSH</span>
            </span>
          </Link>
          <div className="hidden md:flex flex-1 max-w-md">
            <Link href="/shop" className="w-full flex items-center gap-2 rounded-full bg-white/5 border border-white/8 px-4 py-2 text-sm text-app-muted hover:border-white/15 transition-colors duration-220">
              <Search size={16} strokeWidth={2} className="opacity-60" />
              <span>Cherchez une marque, un produit…</span>
            </Link>
          </div>
          <nav className="flex items-center gap-1 shrink-0" style={{ fontFamily: 'var(--app-font-mono)', fontSize: '0.75rem', letterSpacing: '0.02em' }}>
            <Link href="/shop" aria-label="Rechercher" className="md:hidden w-9 h-9 grid place-items-center rounded-full hover:bg-white/5 transition-colors duration-220 "><Search size={18} strokeWidth={2} /></Link>
            <Link href="/shop" className="hidden md:block px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220">Boutique</Link>
            <Link href="/rush" className="hidden md:block px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220">Le Flux</Link>
            <Link href="/flash" className="px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220 text-app-accent">Flash</Link>
            <Link href="/surprise-box" className="hidden md:block px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors duration-220">Box</Link>
            <Link href="/login" aria-label="Compte" className="w-9 h-9 md:w-auto md:h-auto grid place-items-center md:px-4 md:py-1.5 rounded-full md:border md:border-white/12 hover:border-app-accent hover:text-app-accent transition-colors duration-220">
              <span className="md:hidden"><User size={18} strokeWidth={2} /></span><span className="hidden md:inline">Compte</span>
            </Link>
            <CartButton />
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
