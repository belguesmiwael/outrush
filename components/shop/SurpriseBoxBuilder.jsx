'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { composeSurpriseBox } from '@/lib/actions/surprise-box';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

const BUDGETS = [30, 50, 80, 120];
const UNIVERSES = [
  ['', 'Toutes catégories'],
  ['beaute', 'Beauté'],
  ['mode', 'Mode'],
  ['tech', 'Tech'],
  ['maison', 'Maison'],
];

export default function SurpriseBoxBuilder() {
  const [state, action, pending] = useActionState(composeSurpriseBox, null);

  return (
    <div className="space-y-8">
      <form action={action} className="card-hunt p-6 space-y-6">
        <div>
          <label className="text-sm text-app-muted block mb-3">Votre budget</label>
          <div className="grid grid-cols-4 gap-3">
            {BUDGETS.map((b) => (
              <label key={b} className="relative cursor-pointer">
                <input type="radio" name="budget" value={b} defaultChecked={b === 50} className="peer sr-only" />
                <div className="rounded-xl border border-white/10 py-4 text-center font-display font-bold text-lg peer-checked:border-app-accent peer-checked:bg-[color:var(--app-accent)]/10 peer-checked:text-app-accent transition-colors duration-120">
                  {b}$
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-app-muted block mb-3">Univers (optionnel)</label>
          <select name="universe" className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2.5 text-sm">
            {UNIVERSES.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        <button
          disabled={pending}
          className="w-full rounded-xl py-4 font-display font-bold text-lg bg-app-accent text-white disabled:opacity-50 transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]"
        >
          {pending ? 'L’IA compose votre box…' : '🎁 Révéler ma Surprise Box'}
        </button>
      </form>

      {state?.ok === false ? (
        <p className="text-app-accent text-sm text-center">
          {state.error === 'not_enough_stock' || state.error === 'no_fit'
            ? "Pas assez de stock pour composer une box à ce budget. Réessayez avec un autre montant."
            : 'Composition impossible pour le moment.'}
        </p>
      ) : null}

      {state?.ok ? (
        <div className="space-y-5 rise-in">
          <div className="text-center space-y-2">
            <p className="text-app-muted text-sm">Vous payez {formatPrice(state.budget, 'USD')} — vous recevez</p>
            <p className="font-display font-extrabold text-4xl text-app-success">
              {formatPrice(state.total_value, 'USD')} de valeur
            </p>
            <p className="text-app-accent font-medium">
              {state.count} pièces · +{formatPrice(state.savings, 'USD')} de valeur offerte
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {state.box.map((p) => {
              const img = mediaUrl((p.images ?? [])[0]);
              return (
                <div key={p.id} className="card-hunt overflow-hidden">
                  <div className="aspect-square bg-app-surface-2 relative">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : null}
                    <span className="absolute inset-0 grid place-items-center bg-black/50 font-display text-2xl">?</span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-app-muted truncate">{p.brand || 'Surprise'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full rounded-xl py-4 font-display font-bold text-lg bg-app-accent text-white transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]">
            Commander cette box — {formatPrice(state.budget, 'USD')}
          </button>
          <p className="text-xs text-app-muted text-center">
            Le contenu exact reste une surprise jusqu'à la livraison. Valeur garantie supérieure au prix payé.
          </p>
        </div>
      ) : null}
    </div>
  );
}
