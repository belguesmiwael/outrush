import { createClient } from '@/lib/supabase/server';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, title, brand, stock_class, quantity, outlet_price, currency, velocity_14d, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(500);

  const byClass = { hero: [], stable: [], dormant: [], new: [] };
  (products ?? []).forEach((p) => (byClass[p.stock_class] ?? byClass.new).push(p));
  const immobilized = byClass.dormant.reduce((s, p) => s + Number(p.outlet_price) * p.quantity, 0);

  return (
    <main className="p-6 md:p-10 space-y-8">
      <h1 className="font-display font-bold text-3xl">Stock Intelligence</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          ['Héros', byClass.hero.length, 'var(--app-success)'],
          ['Stables', byClass.stable.length, 'var(--app-text)'],
          ['Dormants', byClass.dormant.length, 'var(--app-accent)'],
          ['Nouveaux', byClass.new.length, 'var(--app-text-muted)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card-hunt p-5">
            <p className="font-display font-extrabold text-3xl" style={{ color }}>{value}</p>
            <p className="text-app-muted text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="card-hunt p-5">
        <p className="text-app-muted text-sm">Valeur immobilisée (dormants)</p>
        <p className="font-display font-extrabold text-2xl text-app-accent mt-1">{formatPrice(immobilized, 'USD')}</p>
      </div>
      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl">Dormants — à réveiller</h2>
        {byClass.dormant.length === 0 ? (
          <div className="card-hunt p-10 text-center text-app-muted">Aucun stock ne dort. Le laboratoire tourne.</div>
        ) : (
          <div className="space-y-2">
            {byClass.dormant.map((p) => (
              <div key={p.id} className="card-hunt px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{p.brand ? `${p.brand} — ` : ''}{localized(p.title, 'fr')}</span>
                <span className="text-app-muted shrink-0">{p.quantity} u. · v14 {p.velocity_14d}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-app-muted">Le moteur de packs IA (suggestions + création 1-clic) arrive au Jalon 2 — schéma déjà en place.</p>
      </section>
    </main>
  );
}
