'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const SORTS = [
  ['trending', 'Tendance'],
  ['newest', 'Nouveautés'],
  ['discount', 'Meilleures remises'],
  ['price_asc', 'Prix croissant'],
  ['price_desc', 'Prix décroissant'],
];

export default function ShopFilters({ categories = [], locale = 'fr', current = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback((key, value) => {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  }, [params, pathname, router]);

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="flex gap-2">
        <input
          defaultValue={current.q ?? ''}
          onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', e.currentTarget.value); }}
          placeholder="Cherchez une marque, un produit…"
          className="flex-1 rounded-full bg-white/5 border border-white/8 px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/50 transition-shadow duration-120"
        />
      </div>

      {/* Tri + prix */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={current.sort ?? 'trending'}
          onChange={(e) => setParam('sort', e.target.value)}
          className="rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm"
        >
          {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>

        <input
          type="number" placeholder="Prix min" defaultValue={current.min ?? ''}
          onBlur={(e) => setParam('min', e.target.value)}
          className="w-24 rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm"
        />
        <input
          type="number" placeholder="Prix max" defaultValue={current.max ?? ''}
          onBlur={(e) => setParam('max', e.target.value)}
          className="w-24 rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm"
        />

        {(current.q || current.min || current.max || (current.cat && current.cat !== 'all')) ? (
          <button onClick={() => router.push(pathname)} className="text-sm text-app-muted hover:text-app-accent transition-colors duration-120">
            Réinitialiser
          </button>
        ) : null}
      </div>
    </div>
  );
}
