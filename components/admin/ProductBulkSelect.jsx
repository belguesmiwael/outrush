'use client';
import { useState, useTransition, createContext, useContext } from 'react';
import { deleteProductsBulk } from '@/lib/actions/admin-products';

const SelectContext = createContext(null);

export function ProductSelectProvider({ children }) {
  const [selected, setSelected] = useState(new Set());
  const [pending, start] = useTransition();

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clear = () => setSelected(new Set());



  return (
    <SelectContext.Provider value={{ selected, toggle, clear, removeSelected, pending }}>
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
export function BulkActionBar() {
  const ctx = useProductSelect();
  if (!ctx || ctx.selected.size === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-full px-5 py-3 flex items-center gap-4 shadow-2xl animate-[reveal-up_0.3s_ease]">
      <span className="text-sm font-medium">{ctx.selected.size} sélectionné(s)</span>
      <button onClick={ctx.removeSelected} disabled={ctx.pending}
        className="rounded-full px-4 py-1.5 text-sm font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 active:scale-95">
        {ctx.pending ? 'Suppression…' : 'Supprimer'}
      </button>
      <button onClick={ctx.clear} className="text-sm text-app-muted hover:text-app-text">Annuler</button>
    </div>
  );
}
