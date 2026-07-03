import { createClient } from '@/lib/supabase/server';
import { createPackFromSuggestion, dismissSuggestion, generatePacksBulk } from '@/lib/actions/packs';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CLASS_META = {
  hero: { label: 'Héros', color: 'var(--app-success)' },
  stable: { label: 'Stables', color: 'var(--app-text)' },
  dormant: { label: 'Dormants', color: 'var(--app-accent)' },
  new: { label: 'Nouveaux', color: 'var(--app-text-muted)' },
};

export default async function StockPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: suggestions }, { data: packs }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, brand, stock_class, quantity, outlet_price, currency, velocity_14d, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(1000),
    supabase
      .from('pack_suggestions')
      .select('id, hero_id, dormant_ids, compat_score, margin_sim')
      .eq('status', 'proposed')
      .order('compat_score', { ascending: false })
      .limit(60),
    supabase
      .from('packs')
      .select('id, slug, title, pack_price, status, performance, created_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const byClass = { hero: [], stable: [], dormant: [], new: [] };
  (products ?? []).forEach((p) => (byClass[p.stock_class] ?? byClass.new).push(p));
  const immobilized = byClass.dormant.reduce(
    (s, p) => s + Number(p.outlet_price) * p.quantity,
    0
  );
  const total = (products ?? []).length || 1;

  // Suggestions groupées par dormant (top-3)
  const byDormant = new Map();
  (suggestions ?? []).forEach((s) => {
    const key = s.dormant_ids[0];
    if (!byDormant.has(key)) byDormant.set(key, []);
    if (byDormant.get(key).length < 3) byDormant.get(key).push(s);
  });

  return (
    <main className="p-6 md:p-10 space-y-10">
      <div>
        <h1 className="font-display font-bold text-3xl">Stock Intelligence</h1>
        <p className="text-app-muted mt-1">Aucun stock ne meurt ici.</p>
      </div>

      {/* Répartition — barre segmentée + compteurs */}
      <section className="space-y-4">
        <div className="h-3 rounded-full overflow-hidden flex bg-app-surface-2">
          {['hero', 'stable', 'dormant', 'new'].map((cls) =>
            byClass[cls].length ? (
              <div
                key={cls}
                style={{
                  width: `${(byClass[cls].length / total) * 100}%`,
                  background: CLASS_META[cls].color,
                  opacity: cls === 'stable' ? 0.35 : 0.9,
                }}
              />
            ) : null
          )}
        </div>
        <div className="grid sm:grid-cols-5 gap-4">
          {['hero', 'stable', 'dormant', 'new'].map((cls) => (
            <div key={cls} className="card-hunt p-5">
              <p
                className="font-display font-extrabold text-3xl"
                style={{ color: CLASS_META[cls].color }}
              >
                {byClass[cls].length}
              </p>
              <p className="text-app-muted text-sm mt-1">{CLASS_META[cls].label}</p>
            </div>
          ))}
          <div className="card-hunt p-5 ring-1 ring-[color:var(--app-accent)]/30">
            <p className="font-display font-extrabold text-2xl text-app-accent">
              {formatPrice(immobilized, 'USD')}
            </p>
            <p className="text-app-muted text-sm mt-1">Valeur immobilisée</p>
          </div>
        </div>
      </section>

      {/* Dormants + suggestions de packs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-display font-bold text-xl">
            Dormants à réveiller{' '}
            <span className="text-app-accent">({byClass.dormant.length})</span>
          </h2>
          {(suggestions ?? []).length ? (
            <form action={generatePacksBulk} className="flex items-center gap-2">
              <input
                type="number"
                name="count"
                min="1"
                max="100"
                defaultValue={Math.min(40, byDormant.size)}
                className="w-20 rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm text-app-text"
              />
              <button className="rounded-lg px-4 py-2 font-display font-bold text-sm bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95">
                ⚡ Générer en masse
              </button>
            </form>
          ) : null}
        </div>

        {byClass.dormant.length === 0 ? (
          <div className="card-hunt p-10 text-center text-app-muted">
            Aucun stock ne dort. Le laboratoire tourne.
          </div>
        ) : (
          <div className="space-y-4">
            {byClass.dormant.map((dormant) => {
              const suggs = byDormant.get(dormant.id) ?? [];
              return (
                <div key={dormant.id} className="card-hunt p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {dormant.brand ? `${dormant.brand} — ` : ''}
                        {localized(dormant.title, 'fr')}
                      </p>
                      <p className="text-xs text-app-muted mt-0.5">
                        {dormant.quantity} u. · v14 {dormant.velocity_14d} ·{' '}
                        {formatPrice(dormant.outlet_price, dormant.currency)} ·{' '}
                        {formatPrice(Number(dormant.outlet_price) * dormant.quantity, dormant.currency)}{' '}
                        immobilisés
                      </p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-[color:var(--app-accent)]/15 text-app-accent uppercase tracking-widest">
                      dormant
                    </span>
                  </div>

                  {suggs.length === 0 ? (
                    <p className="text-xs text-app-muted">
                      Pas encore de suggestion — le moteur passe chaque nuit.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-3">
                      {suggs.map((s) => {
                        const hero = byId.get(s.hero_id);
                        const sim = s.margin_sim ?? {};
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl border border-white/8 bg-app-surface-2/60 p-3 space-y-2"
                          >
                            <p className="text-sm leading-snug">
                              <span className="text-app-success font-medium">＋ héros</span>{' '}
                              {hero ? localized(hero.title, 'fr') : '—'}
                            </p>
                            <p className="text-xs text-app-muted">
                              compat {Math.round(Number(s.compat_score) * 100)}% · pack{' '}
                              {formatPrice(sim.pack_price, 'USD')} · −{sim.pack_discount_pct}% vs
                              séparé
                            </p>
                            <div className="flex gap-2">
                              <form action={createPackFromSuggestion} className="flex-1">
                                <input type="hidden" name="suggestionId" value={s.id} />
                                <button className="w-full text-sm font-display font-bold rounded-lg py-2 bg-app-accent text-white transition-transform duration-[120ms] hover:scale-[1.02] active:scale-95">
                                  Créer le pack
                                </button>
                              </form>
                              <form action={dismissSuggestion}>
                                <input type="hidden" name="suggestionId" value={s.id} />
                                <button
                                  className="text-sm rounded-lg px-3 py-2 text-app-muted hover:text-app-text"
                                  title="Écarter"
                                >
                                  ✕
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Packs actifs */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl">Packs actifs</h2>
        {(packs ?? []).length === 0 ? (
          <div className="card-hunt p-8 text-center text-app-muted">
            Aucun pack — créez-en un depuis une suggestion ci-dessus.
          </div>
        ) : (
          <div className="space-y-2">
            {packs.map((pk) => (
              <div
                key={pk.id}
                className="card-hunt px-4 py-3 flex items-center justify-between gap-3 text-sm"
              >
                <a href={`/pack/${pk.slug}`} className="min-w-0 truncate hover:text-app-accent">
                  {localized(pk.title, 'fr')}
                </a>
                <span className="text-app-muted shrink-0">
                  {formatPrice(pk.pack_price, 'USD')} · {pk.performance?.conversions ?? 0} vente(s) ·{' '}
                  {pk.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
