import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateOrderStatus, setShipping } from '@/lib/actions/admin-orders';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS = {
  pending: ['Nouvelle', 'var(--app-accent)'],
  paid: ['Payée', 'var(--app-success)'],
  shipped: ['Expédiée', 'var(--app-text)'],
  delivered: ['Livrée', 'var(--app-success)'],
  cancelled: ['Annulée', 'var(--app-text-muted)'],
  refunded: ['Remboursée', 'var(--app-text-muted)'],
};

export default async function AdminOrdersPage({ searchParams }) {
  const { status = '' } = (await searchParams) ?? {};
  const admin = createAdminClient();

  let query = admin
    .from('orders')
    .select('id, order_number, status, total, currency, customer_name, customer_phone, shipping_address, carrier, tracking_number, payment_method, created_at, order_items(qty, unit_price, product:products(title, brand))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) query = query.eq('status', status);
  const { data: orders } = await query;

  return (
    <main className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold text-3xl">Commandes</h1>
        <div className="flex gap-1 text-sm overflow-x-auto">
          {[['', 'Toutes'], ['pending', 'Nouvelles'], ['shipped', 'Expédiées'], ['delivered', 'Livrées'], ['cancelled', 'Annulées']].map(([v, label]) => (
            <Link key={v} href={`/admin/orders${v ? `?status=${v}` : ''}`}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors duration-120 ${status === v ? 'bg-app-accent text-white' : 'text-app-muted hover:bg-app-surface'}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {(orders ?? []).length === 0 ? (
        <div className="card-hunt p-16 text-center text-app-muted">Aucune commande pour l'instant.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const [label, color] = STATUS[o.status] ?? STATUS.pending;
            return (
              <div key={o.id} className="card-hunt p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-lg">{o.order_number}</span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ color, background: 'rgba(255,255,255,0.05)' }}>{label}</span>
                      <span className="text-xs text-app-muted">💵 {o.payment_method === 'cod' ? 'À la livraison' : o.payment_method}</span>
                    </div>
                    <p className="text-sm text-app-muted mt-1">
                      {o.customer_name} · {o.customer_phone} · {o.shipping_address?.city}, {o.shipping_address?.country}
                    </p>
                    <p className="text-xs text-app-muted mt-0.5">{o.shipping_address?.line}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-extrabold text-xl text-app-accent">{formatPrice(o.total, o.currency)}</p>
                    <p className="text-xs text-app-muted">{new Date(o.created_at).toLocaleString('fr')}</p>
                  </div>
                </div>

                {/* Articles */}
                <div className="text-sm space-y-1 border-t border-white/5 pt-3">
                  {(o.order_items ?? []).map((it, i) => (
                    <div key={i} className="flex justify-between text-app-muted">
                      <span>{it.product?.brand ? `${it.product.brand} — ` : ''}{it.product?.title?.fr ?? '—'} ×{it.qty}</span>
                      <span>{formatPrice(it.unit_price * it.qty, o.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap border-t border-white/5 pt-3">
                  {['pending', 'paid'].includes(o.status) ? (
                    <form action={setShipping} className="flex items-end gap-2 flex-wrap">
                      <input type="hidden" name="orderId" value={o.id} />
                      <input name="carrier" placeholder="Transporteur" defaultValue={o.carrier ?? ''} className="rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm w-36" />
                      <input name="tracking" placeholder="N° de suivi" defaultValue={o.tracking_number ?? ''} className="rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm w-36" />
                      <button className="rounded-lg px-4 py-2 text-sm font-display font-bold bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95">Marquer expédiée</button>
                    </form>
                  ) : null}

                  <Link href={`/admin/orders/${o.id}/label`} target="_blank"
                    className="rounded-lg px-4 py-2 text-sm border border-white/10 hover:bg-app-surface transition-colors duration-120">
                    🖨️ Bordereau
                  </Link>

                  {o.status === 'shipped' ? (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <input type="hidden" name="status" value="delivered" />
                      <button className="rounded-lg px-4 py-2 text-sm text-app-success border border-app-success/30 hover:bg-app-success/10 transition-colors duration-120">Marquer livrée</button>
                    </form>
                  ) : null}

                  {!['cancelled', 'delivered'].includes(o.status) ? (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <button className="rounded-lg px-3 py-2 text-sm text-app-muted hover:text-app-accent transition-colors duration-120">Annuler</button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
