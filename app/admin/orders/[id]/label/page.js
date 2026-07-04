import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import PrintTrigger from '@/components/admin/PrintTrigger';

export const dynamic = 'force-dynamic';

export default async function ShippingLabelPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: o } = await admin
    .from('orders')
    .select('*, order_items(qty, unit_price, product:products(title, brand, gtin))')
    .eq('id', id)
    .maybeSingle();
  if (!o) notFound();

  const addr = o.shipping_address ?? {};

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100dvh', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <PrintTrigger />
      <div style={{ maxWidth: 780, margin: '0 auto', border: '2px solid #111', borderRadius: 8, overflow: 'hidden' }}>
        {/* En-tête */}
        <div style={{ background: '#111', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: -0.5 }}>OUT<span style={{ color: '#e8442e' }}>RUSH</span></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>BORDEREAU D'EXPÉDITION</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{o.order_number}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Expéditeur */}
          <div style={{ padding: 24, borderRight: '1px solid #ddd' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 8 }}>Expéditeur</div>
            <div style={{ fontWeight: 700 }}>OUTRUSH — Entrepôt</div>
            <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>Marketplace outlet mondiale</div>
          </div>
          {/* Destinataire */}
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 8 }}>Destinataire</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{o.customer_name}</div>
            <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>{addr.line}</div>
            <div style={{ fontSize: 14, color: '#444' }}>{addr.city}, {addr.country}</div>
            <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>📞 {o.customer_phone}</div>
          </div>
        </div>

        {/* Paiement */}
        <div style={{ padding: '16px 24px', background: '#fff5f3', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#e8442e', fontSize: 18 }}>
            {o.payment_method === 'cod' ? '💵 PAIEMENT À LA LIVRAISON' : 'PAYÉ'}
          </div>
          <div style={{ fontWeight: 800, fontSize: 24 }}>{formatPrice(o.total, o.currency)}</div>
        </div>

        {/* Colis */}
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 }}>Contenu du colis</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {(o.order_items ?? []).map((it, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 0' }}>{it.product?.brand ? `${it.product.brand} — ` : ''}{it.product?.title?.fr ?? '—'}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center', width: 60 }}>×{it.qty}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', width: 100 }}>{formatPrice(it.unit_price * it.qty, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transport */}
        {o.carrier || o.tracking_number ? (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #ddd', fontSize: 14 }}>
            <strong>Transporteur :</strong> {o.carrier ?? '—'} &nbsp;·&nbsp; <strong>Suivi :</strong> {o.tracking_number ?? '—'}
          </div>
        ) : null}
      </div>
      <div style={{ maxWidth: 780, margin: '16px auto 0', textAlign: 'center' }} className="no-print">
        <button onClick={undefined} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
