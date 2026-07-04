'use client';
import Link from 'next/link';
import CategoryIcon from './CategoryIcon';
import { localized } from '@/lib/i18n/dictionaries';

/** Grille de catégories : cartes profondes, icône Lucide, halo au survol. */
export default function CategoryGrid({ categories, locale = 'fr' }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {categories.map((c, i) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className="group relative rise-in overflow-hidden rounded-2xl border border-white/6 p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-380 ease-out-expo hover:border-[color:var(--app-accent)]/40 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(160deg, oklch(22% 0.014 264), oklch(18% 0.014 264))',
            animationDelay: `${Math.min(i * 35, 500)}ms`,
          }}
        >
          {/* Halo au survol */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-380 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, oklch(62% 0.24 25 / 0.18), transparent 65%)' }}
          />
          <div className="relative w-11 h-11 grid place-items-center rounded-xl bg-white/5 group-hover:bg-[color:var(--app-accent)]/15 transition-colors duration-380">
            <CategoryIcon
              name={c.icon}
              className="w-5 h-5 text-app-muted group-hover:text-app-accent transition-colors duration-380"
              strokeWidth={1.75}
            />
          </div>
          <span className="relative text-sm font-medium leading-tight">{localized(c.name, locale)}</span>
        </Link>
      ))}
    </div>
  );
}
