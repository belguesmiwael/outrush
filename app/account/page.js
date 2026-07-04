import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS = {
  pending: ['En préparation', 'var(--app-accent)'],
  paid: ['Payée', 'var(--app-success)'],
  shipped: ['Expédiée', 'var(--app-text)'],
  delivered: ['Livrée', 'var(--app-success)'],
  cancelled: ['Annulée', 'var(--app-text-muted)'],
  refunded: ['Remboursée', 'var(--app-text-muted)'],
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, currency, carrier, tracking_number, created_at, order_items(qty, product:products(title, brand))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-3xl">Mon compte</h1>
            <p className="text-app-muted text-sm mt-1">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">Se déconnecter</button>
          </form>
        </div>

        <div>
          <h2 className="font-display font-bold text-xl mb-4">Mes commandes</h2>
          {(orders ?? []).length === 0 ? (
            <div className="card-premium p-12 text-center space-y-3">
              <div className="text-4xl opacity-30">📦</div>
              <p className="text-app-muted">Aucune commande pour l'instant.</p>
              <Link href="/" className="btn-rush inline-flex">Commencer la chasse</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const [label, color] = STATUS[o.status] ?? STATUS.pending;
                return (
                  <div key={o.id} className="card-premium p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold">{o.order_number}</span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ color, background: 'rgba(255,255,255,0.05)' }}>{label}</span>
                      </div>
                      <span className="font-display font-extrabold text-app-accent">{formatPrice(o.total, o.currency)}</span>
                    </div>
                    <div className="text-sm text-app-muted">
                      {(o.order_items ?? []).map((it, i) => (
                        <span key={i}>{it.product?.title?.fr ?? '—'} ×{it.qty}{i < o.order_items.length - 1 ? ' · ' : ''}</span>
                      ))}
                    </div>
                    {o.tracking_number ? (
                      <p className="text-xs text-app-muted">Suivi : {o.carrier} · {o.tracking_number}</p>
                    ) : null}
                    <p className="text-xs text-app-muted">{new Date(o.created_at).toLocaleString('fr')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
