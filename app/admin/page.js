import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';
import AdminCommandBar from '@/components/admin/AdminCommandBar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { count: published },
    { count: drafts },
    { count: pending },
    { count: packs },
    { count: dormants },
    { data: liveFlash },
    { data: sales },
    { data: recent },
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('packs').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('stock_class', 'dormant'),
    supabase.from('flash_sales').select('id, title, ends_at').eq('status', 'live').order('ends_at', { ascending: true }).limit(5),
    admin.from('inventory_movements').select('delta, reason, created_at').in('reason', ['sale', 'flash_claim']).limit(20000),
    admin.from('inventory_movements').select('delta, reason, created_at, product:products(title, outlet_price, currency)').in('reason', ['sale', 'flash_claim']).order('created_at', { ascending: false }).limit(8),
  ]);

  const unitsSold = (sales ?? []).reduce((s, m) => s + Math.abs(m.delta), 0);
  const today = new Date().toISOString().slice(0, 10);
  const soldToday = (sales ?? []).filter((m) => m.created_at?.slice(0, 10) === today).reduce((s, m) => s + Math.abs(m.delta), 0);

  const tiles = [
    ['Produits en ligne', published ?? 0, '/admin/products', 'var(--app-success)'],
    ['Stock dormant', dormants ?? 0, '/ops/stock', 'var(--app-accent)'],
    ['Packs actifs', packs ?? 0, '/ops/stock', 'var(--app-text)'],
    ['Lots à valider', pending ?? 0, '/admin/scan', 'var(--app-text)'],
    ['Vendus aujourd\'hui', soldToday, null, 'var(--app-success)'],
    ['Ventes totales', unitsSold, null, 'var(--app-text)'],
  ];

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl">Salle de contrôle</h1>
          <p className="text-app-muted text-sm mt-1">Le cerveau d'OUTRUSH — pilotez, l'IA exécute.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/scan" className="rounded-lg px-4 py-2.5 font-display font-bold text-sm border border-white/10 hover:border-app-accent hover:text-app-accent transition-colors duration-120">📷 Scanner</Link>
          <Link href="/admin/products/new" className="rounded-lg px-4 py-2.5 font-display font-bold text-sm bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95">+ Produit</Link>
        </div>
      </div>

      {/* AI Brain */}
      <AdminCommandBar />

      {/* Tuiles live */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {tiles.map(([label, value, href, color]) => {
          const card = (
            <div className="card-hunt p-5 h-full">
              <p className="font-display font-extrabold text-3xl" style={{ color }}>{value}</p>
              <p className="text-app-muted text-sm mt-1">{label}</p>
            </div>
          );
          return href ? <Link key={label} href={href}>{card}</Link> : <div key={label}>{card}</div>;
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Flash actives */}
        <section className="card-hunt p-6 space-y-4">
          <h2 className="font-display font-bold flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent" />
            </span>
            Ventes flash en cours
          </h2>
          {(liveFlash ?? []).length === 0 ? (
            <p className="text-app-muted text-sm">Aucune vente flash active. Dites à l'IA : « lance un flash sur les dormants ».</p>
          ) : (
            <div className="space-y-2">
              {liveFlash.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                  <span>{localized(f.title, 'fr')}</span>
                  <span className="text-app-muted text-xs">se termine {new Date(f.ends_at).toLocaleString('fr')}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dernières ventes */}
        <section className="card-hunt p-6 space-y-4">
          <h2 className="font-display font-bold">Dernières ventes</h2>
          {(recent ?? []).length === 0 ? (
            <p className="text-app-muted text-sm">Pas encore de vente enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                  <span className="truncate min-w-0">{m.product ? localized(m.product.title, 'fr') : '—'}</span>
                  <span className="text-app-muted text-xs shrink-0">
                    {Math.abs(m.delta)}× · {m.product ? formatPrice(m.product.outlet_price, m.product.currency) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
