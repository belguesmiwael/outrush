import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ count: published }, { count: drafts }, { count: pending }, { count: packs }, { data: settings }, { data: sales }] =
    await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('packs').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('app_settings').select('key, value'),
      admin.from('inventory_movements').select('delta, reason').in('reason', ['sale', 'flash_claim']).limit(20000),
    ]);

  const unitsSold = (sales ?? []).reduce((s, m) => s + Math.abs(m.delta), 0);

  const stats = [
    ['Produits en ligne', published ?? 0, '/admin/products'],
    ['Brouillons', drafts ?? 0, '/admin/products'],
    ['Lots fournisseurs en attente', pending ?? 0, '/ops/scan/queue'],
    ['Packs actifs', packs ?? 0, '/ops/stock'],
    ['Unités vendues', unitsSold, null],
  ];

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold text-3xl">Tableau de bord</h1>
        <div className="flex gap-2">
          <Link
            href="/ops/scan"
            className="rounded-lg px-4 py-2.5 font-display font-bold text-sm border border-white/10 hover:border-app-accent hover:text-app-accent transition-colors duration-120"
          >
            📷 Scanner
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-lg px-4 py-2.5 font-display font-bold text-sm bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95"
          >
            + Nouveau produit
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(([label, value, href]) => {
          const card = (
            <div className="card-hunt p-5 h-full">
              <p className="font-display font-extrabold text-3xl">{value}</p>
              <p className="text-app-muted text-sm mt-1">{label}</p>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>{card}</Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      <section className="card-hunt p-6 space-y-4 max-w-2xl">
        <h2 className="font-display font-bold">Configuration</h2>
        {(settings ?? []).length === 0 ? (
          <p className="text-sm text-app-muted">Aucun réglage — valeurs par défaut appliquées.</p>
        ) : (
          (settings ?? []).map((s) => (
            <div key={s.key} className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <span className="text-app-muted">{s.key}</span>
              <span className="font-mono">{JSON.stringify(s.value)}</span>
            </div>
          ))
        )}
        <p className="text-xs text-app-muted">Édition des marges cibles, budget scan et devises : à venir.</p>
      </section>
    </main>
  );
}
