'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { depositLot } from '@/lib/actions/supplier';

const inputCls =
  'w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/60 transition-shadow duration-120';

export default function LotDepositForm() {
  const router = useRouter();
  const [mode, setMode] = useState('csv'); // csv | manual
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  function onSubmit(formData) {
    setResult(null);
    startTransition(async () => {
      const res = await depositLot(formData);
      if (!res.ok) {
        const messages = {
          lot_invalid: 'Nom de lot invalide (2 caractères minimum).',
          csv_too_big: 'CSV trop lourd (512 KB max).',
          csv_empty: 'CSV vide.',
          csv_header: 'En-têtes CSV attendus : title, quantity, asking_price (+ brand, gtin, condition).',
          no_rows: 'Aucune ligne à déposer.',
          all_rows_invalid: `Toutes les lignes sont invalides${res.rejected ? ` (lignes ${res.rejected.join(', ')})` : ''}.`,
        };
        setResult({ ok: false, msg: messages[res.error] ?? `Dépôt impossible (${res.error}).` });
      } else {
        setResult({
          ok: true,
          msg: `Lot déposé : ${res.inserted} article(s) transmis à la revue OUTRUSH${
            res.rejected?.length ? ` · ${res.rejected.length} ligne(s) ignorée(s) : ${res.rejected.join(', ')}` : ''
          }.`,
        });
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="card-hunt p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-lg">Déposer un lot</h2>
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-sm">
          {[['csv', 'Fichier CSV'], ['manual', 'Saisie rapide']].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 transition-colors duration-120 ${
                mode === m ? 'bg-app-accent text-white font-medium' : 'text-app-muted hover:text-app-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-app-muted">Nom du lot *</span>
          <input name="lotName" required maxLength={120} placeholder="Fin de série printemps 2026" className={inputCls} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-app-muted">Note (optionnel)</span>
          <input name="lotNote" maxLength={600} placeholder="Provenance, particularités…" className={inputCls} />
        </label>
      </div>

      {mode === 'csv' ? (
        <div className="space-y-2">
          <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 px-4 py-6 text-center text-sm text-app-muted hover:border-[color:var(--app-accent)]/60 hover:text-app-text transition-colors duration-120">
            📄 Choisir le fichier CSV
            <input type="file" name="csv" accept=".csv,text/csv" className="hidden" />
          </label>
          <p className="text-xs text-app-muted">
            Colonnes : <span className="font-mono">title, quantity, asking_price</span> (obligatoires) +{' '}
            <span className="font-mono">brand, gtin, condition</span> (new / like_new / box_damaged). 500 lignes max.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-app-muted">Titre produit *</span>
            <input name="title" maxLength={140} placeholder="Sérum vitamine C 30 ml" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Marque</span>
            <input name="brand" maxLength={80} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">GTIN / EAN (optionnel)</span>
            <input name="gtin" pattern="\d{8,14}" placeholder="3600524030018" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Quantité *</span>
            <input name="quantity" type="number" min="1" max="100000" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Prix demandé / unité (USD) *</span>
            <input name="askingPrice" type="number" step="0.01" min="0.01" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">État</span>
            <select name="condition" defaultValue="new" className={inputCls}>
              <option value="new">Neuf</option>
              <option value="like_new">Comme neuf</option>
              <option value="box_damaged">Boîte abîmée</option>
            </select>
          </label>
        </div>
      )}

      {result ? (
        <p className={`text-sm ${result.ok ? 'text-app-success' : 'text-app-accent'}`}>{result.msg}</p>
      ) : null}

      <button
        disabled={pending}
        className="w-full rounded-xl py-3 font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]"
      >
        {pending ? 'Dépôt en cours…' : 'Déposer le lot'}
      </button>
    </form>
  );
}
