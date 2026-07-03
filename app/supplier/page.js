import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';
import LotDepositForm from '@/components/supplier/LotDepositForm';

export const dynamic = 'force-dynamic';

const LOT_STATUS = {
  submitted: ['Transmis', 'var(--app-text-muted)'],
  reviewing: ['En revue', 'var(--app-text)'],
  live: ['En vente', 'var(--app-success)'],
  closed: ['Clôturé', 'var(--app-text-muted)'],
};

export default async function SupplierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS : le fournisseur ne voit que SES lots et SES produits
  const [{ data: lots }, { data: products }] = await Promise.all([
    supabase.from('supplier_lots').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(100),
    supabase
      .from('products')
      .select('id, lot_id, title, brand, quantity, outlet_price, currency, status, specs')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  // Écoulement : unités vendues par produit — calcul SERVEUR, filtré sur les
  // produits du fournisseur authentifié (le ledger n'est jamais exposé au client)
  const soldByProduct = new Map();
  const productIds = (products ?? []).map((p) => p.id);
  if (user && productIds.length) {
    const admin = createAdminClient();
    const { data: sales } = await admin
      .from('inventory_movements')
      .select('product_id, delta')
      .in('product_id', productIds)
      .in('reason', ['sale', 'flash_claim'])
      .limit(20000);
    (sales ?? []).forEach((m) => {
      soldByProduct.set(m.product_id, (soldByProduct.get(m.product_id) ?? 0) + Math.abs(m.delta));
    });
  }

  const byLot = new Map();
  (products ?? []).forEach((p) => {
    if (!byLot.has(p.lot_id)) byLot.set(p.lot_id, []);
    byLot.get(p.lot_id).push(p);
  });

  const totalSoldUnits = [...soldByProduct.values()].reduce((s, v) => s + v, 0);
  const totalRevenue = (products ?? []).reduce(
    (s, p) => s + (soldByProduct.get(p.id) ?? 0) * Number(p.outlet_price),
    0
  );
  const liveCount = (products ?? []).filter((p) => p.status === 'published').length;

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-3xl">
          Portail fournisseur <span className="text-app-accent">OUTRUSH</span>
        </h1>
        <p className="text-app-muted mt-1">Déposez vos lots — on scanne, on vérifie, on vend.</p>
      </div>

      {/* Relevé */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ['Articles en vente', liveCount],
          ['Unités écoulées', totalSoldUnits],
          ['Revenu généré (brut)', formatPrice(totalRevenue, 'USD')],
        ].map(([label, value]) => (
          <div key={label} className="card-hunt p-5">
            <p className="font-display font-extrabold text-2xl">{value}</p>
            <p className="text-app-muted text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <LotDepositForm />

      {/* Lots + écoulement */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-xl">Mes lots ({(lots ?? []).length})</h2>
        {(lots ?? []).length === 0 ? (
          <div className="card-hunt p-10 text-center text-app-muted">
            Aucun lot déposé — le premier est à un CSV près.
          </div>
        ) : (
          <div className="space-y-4">
            {lots.map((lot) => {
              const items = byLot.get(lot.id) ?? [];
              const [statusLabel, statusColor] = LOT_STATUS[lot.status] ?? LOT_STATUS.submitted;
              const declared = items.reduce(
                (s, p) => s + Number(p.specs?.supplier_declared_qty ?? 0), 0);
              const sold = items.reduce((s, p) => s + (soldByProduct.get(p.id) ?? 0), 0);
              const pct = declared > 0 ? Math.min(100, Math.round((sold / declared) * 100)) : 0;
              return (
                <div key={lot.id} className="card-hunt p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-medium">{lot.name}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/5" style={{ color: statusColor }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-app-muted mb-1">
                      <span>Écoulement</span>
                      <span>{sold} / {declared} u. ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-app-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-[600ms]"
                        style={{ width: `${pct}%`, background: 'var(--app-accent)' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 8).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-app-muted">
                          {p.brand ? `${p.brand} — ` : ''}{localized(p.title, 'fr')}
                        </span>
                        <span className="shrink-0 text-xs text-app-muted">
                          {soldByProduct.get(p.id) ?? 0} vendue(s) · {p.quantity} en stock ·{' '}
                          {p.status === 'published' ? (
                            <span className="text-app-success">en ligne</span>
                          ) : p.status === 'pending_review' ? 'en revue' : p.status}
                        </span>
                      </div>
                    ))}
                    {items.length > 8 ? (
                      <p className="text-xs text-app-muted">+ {items.length - 8} autre(s) article(s)</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
