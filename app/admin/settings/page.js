import { createClient } from '@/lib/supabase/server';
import { updateCurrencySettings } from '@/lib/actions/admin-settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('app_settings').select('key, value').in('key', ['display_currency', 'fx_rates']);
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const currency = map.get('display_currency') ?? 'USD';
  const rates = map.get('fx_rates') ?? { EUR: 0.92, TND: 3.15 };

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display font-bold text-3xl">Réglages</h1>
        <div className="rule-accent mt-2" />
      </div>

      <form action={updateCurrencySettings} className="card-hunt p-6 space-y-6">
        <div>
          <h2 className="font-display font-bold text-lg">Devise d'affichage</h2>
          <p className="text-app-muted text-sm mt-1">
            Les prix sont stockés en USD. La boutique les affiche dans la devise choisie, convertis avec les taux ci-dessous.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['USD', 'EUR', 'TND'].map((c) => (
            <label key={c} className="relative cursor-pointer">
              <input type="radio" name="currency" value={c} defaultChecked={currency === c} className="peer sr-only" />
              <div className="rounded-xl border border-white/10 py-4 text-center font-display font-bold peer-checked:border-app-accent peer-checked:bg-[color:var(--app-accent)]/10 peer-checked:text-app-accent transition-colors duration-120">
                {c}
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-app-muted">Taux de conversion (1 USD =)</p>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">1 USD → EUR</span>
            <input name="rate_eur" type="number" step="0.0001" defaultValue={rates.EUR ?? 0.92} className="w-32 rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">1 USD → TND</span>
            <input name="rate_tnd" type="number" step="0.0001" defaultValue={rates.TND ?? 3.15} className="w-32 rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm" />
          </label>
        </div>

        <button className="btn-rush">Enregistrer</button>
      </form>
    </main>
  );
}
