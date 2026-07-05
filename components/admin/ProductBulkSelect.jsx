'use client';
import { useState, useTransition, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProductsBulk, classifyProductsBulk } from '@/lib/actions/admin-products';

const SelectContext = createContext(null);

export function ProductSelectProvider({ children }) {
  const [selected, setSelected] = useState(new Set());
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clear = () => setSelected(new Set());

  function removeSelected() {
    if (!selected.size) return;
    if (!confirm(`Supprimer ${selected.size} produit(s) ?`)) return;
    start(async () => {
      const res = await deleteProductsBulk([...selected]);
      if (res?.ok === false) alert('Suppression impossible : ' + (res.detail ?? res.error));
      clear();
    });
  }

  function classifySelected(categoryId) {
    if (!selected.size || !categoryId) return;
    start(async () => {
      const res = await classifyProductsBulk([...selected], categoryId);
      if (res?.ok === false) alert('Classification impossible : ' + (res.detail ?? res.error));
      else clear();
      router.refresh();
    });
  }

  return (
    <SelectContext.Provider value={{ selected, toggle, clear, removeSelected, classifySelected, pending }}>
      {children}
    </SelectContext.Provider>
  );
}

export function useProductSelect() {
  return useContext(SelectContext);
}

/** Case à cocher pour un produit (dans la liste). */
export function ProductCheckbox({ id }) {
  const ctx = useProductSelect();
  if (!ctx) return null;
  return (
    <input
      type="checkbox"
      checked={ctx.selected.has(id)}
      onChange={() => ctx.toggle(id)}
      className="w-4 h-4 accent-[color:var(--app-accent)] cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** Barre d'action flottante quand des produits sont sélectionnés. */
export function BulkActionBar({ categories = [] }) {
  const ctx = useProductSelect();
  if (!ctx || ctx.selected.size === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-3 shadow-2xl animate-[reveal-up_0.3s_ease] max-w-[calc(100vw-1rem)] safe-b">
      <span className="text-sm font-medium num">{ctx.selected.size}</span>
      <span className="text-sm text-app-muted">sélectionné(s)</span>

      {categories.length ? (
        <select
          defaultValue=""
          disabled={ctx.pending}
          onChange={(e) => { if (e.target.value) ctx.classifySelected(e.target.value); e.target.value = ''; }}
          className="rounded-full bg-app-surface-2 border border-white/10 px-3 py-2 text-sm max-w-[46vw] disabled:opacity-50"
        >
          <option value="" disabled>Classer dans…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{typeof c.name === 'object' ? (c.name.fr ?? c.slug) : (c.name ?? c.slug)}</option>
          ))}
        </select>
      ) : null}

      <button onClick={ctx.removeSelected} disabled={ctx.pending}
        className="rounded-full px-4 py-2 text-sm font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 active:scale-95">
        {ctx.pending ? '…' : 'Supprimer'}
      </button>
      <button onClick={ctx.clear} className="text-sm text-app-muted hover:text-app-text">Annuler</button>
    </div>
  );
}
