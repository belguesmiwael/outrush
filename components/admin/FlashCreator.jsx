'use client';
import { useState } from 'react';
import { createFlashSale } from '@/lib/actions/admin-flash';
import { useRouter } from 'next/navigation';

function localDefault(hoursFromNow) {
  const d = new Date(Date.now() + hoursFromNow * 3600000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function FlashCreator({ products = [] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(localDefault(0));
  const [endsAt, setEndsAt] = useState(localDefault(24));
  const [rows, setRows] = useState([]); // {productId, flashPrice, qty}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function addProduct(p) {
    if (rows.find((r) => r.productId === p.id)) return;
    // Prix flash suggéré : 15% sous l'outlet
    const suggested = p.outlet_price ? Math.max(0.5, (p.outlet_price * 0.85)).toFixed(2) : '';
    setRows((r) => [...r, { productId: p.id, title: p.title?.fr ?? p.slug, outlet: p.outlet_price, max: p.quantity ?? 1, flashPrice: suggested, qty: Math.min(p.quantity ?? 1, 5) }]);
  }
  function update(id, field, value) {
    setRows((r) => r.map((x) => x.productId === id ? { ...x, [field]: value } : x));
  }
  function remove(id) {
    setRows((r) => r.filter((x) => x.productId !== id));
  }

  async function submit() {
    setError(null);
    if (!title.trim()) return setError('Donnez un titre au drop.');
    if (!rows.length) return setError('Ajoutez au moins un produit.');
    setSaving(true);
    try {
      const res = await createFlashSale({
        title, startsAt, endsAt,
        items: rows.map((r) => ({ productId: r.productId, flashPrice: r.flashPrice, qty: r.qty })),
      });
      if (res?.ok) {
        setOpen(false); setTitle(''); setRows([]);
        router.refresh();
      } else {
        setError(res?.detail ?? res?.error ?? 'Échec');
      }
    } catch {
      setError('Erreur serveur');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-rush">
        + Créer un drop flash
      </button>
    );
  }

  const available = products.filter((p) => !rows.find((r) => r.productId === p.id));

  return (
    <div className="card-premium p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl">Nouveau drop flash</h2>
        <button onClick={() => setOpen(false)} className="text-app-muted hover:text-app-text text-sm">Annuler</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="space-y-1 sm:col-span-3">
          <span className="eyebrow">Titre du drop</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Rush Beauté 24h"
            className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Début</span>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Fin</span>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm" />
        </label>
      </div>

      {/* Produits ajoutés */}
      {rows.length ? (
        <div className="space-y-2">
          <p className="eyebrow">Produits du drop ({rows.length})</p>
          {rows.map((r) => (
            <div key={r.productId} className="flex items-center gap-3 card-hunt px-3 py-2">
              <span className="flex-1 text-sm truncate">{r.title}</span>
              <label className="flex items-center gap-1 text-xs text-app-muted">
                Prix flash
                <input type="number" step="0.01" value={r.flashPrice} onChange={(e) => update(r.productId, 'flashPrice', e.target.value)}
                  className="w-20 rounded-lg bg-app-surface-2 border border-white/8 px-2 py-1 num" />
              </label>
              <label className="flex items-center gap-1 text-xs text-app-muted">
                Qté
                <input type="number" min="1" max={r.max} value={r.qty} onChange={(e) => update(r.productId, 'qty', e.target.value)}
                  className="w-16 rounded-lg bg-app-surface-2 border border-white/8 px-2 py-1 num" />
              </label>
              <button onClick={() => remove(r.productId)} className="text-app-muted hover:text-app-accent text-xs">✕</button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ajouter des produits */}
      <div className="space-y-2">
        <p className="eyebrow">Ajouter un produit</p>
        <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
          {available.slice(0, 40).map((p) => (
            <button key={p.id} onClick={() => addProduct(p)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-app-surface text-left text-sm transition-colors duration-120">
              <span className="truncate">{p.title?.fr ?? p.slug}</span>
              <span className="text-app-muted text-xs shrink-0 num">stock {p.quantity ?? 0}</span>
            </button>
          ))}
          {available.length === 0 ? <p className="text-app-muted text-sm px-3 py-2">Aucun autre produit disponible.</p> : null}
        </div>
      </div>

      {error ? <p className="text-app-accent text-sm">{error}</p> : null}

      <button onClick={submit} disabled={saving} className="btn-rush disabled:opacity-50">
        {saving ? 'Création…' : 'Lancer le drop'}
      </button>
    </div>
  );
}
