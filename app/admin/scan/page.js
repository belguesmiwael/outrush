import { createAdminClient } from '@/lib/supabase/admin';
import ScannerPanel from '@/components/ops/ScannerPanel';
import ScanManager from '@/components/admin/ScanManager';
import { publishScannedProduct } from '@/lib/actions/scan';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminScanPage() {
  const admin = createAdminClient();
  const { data: scans } = await admin
    .from('scan_events')
    .select('id, code, status, enrichment, product:products(title, brand, images, market_price, outlet_price, currency)')
    .in('status', ['ready', 'duplicate', 'not_found', 'enriching', 'queued'])
    .order('created_at', { ascending: false })
    .limit(60);

  const ready = (scans ?? []).filter((s) => s.status === 'ready' && s.product);

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl">Scanner</h1>
        <p className="text-app-muted text-sm mt-1">Scannez, validez et gérez vos scans — tout ici.</p>
      </div>

      {/* Le scanner */}
      <div className="rounded-2xl overflow-hidden border border-white/5">
        <ScannerPanel />
      </div>

      {/* Prêtes à publier */}
      {ready.length ? (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl">Prêtes à publier ({ready.length})</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ready.map((scan, i) => {
              const p = scan.product;
              const img = p.images?.[0]
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${p.images[0]}`
                : null;
              return (
                <form key={scan.id} action={publishScannedProduct} className="card-hunt p-4 space-y-3">
                  <input type="hidden" name="scanId" value={scan.id} />
                  <div className="flex gap-3">
                    <div className="w-20 h-24 rounded-lg overflow-hidden bg-app-surface-2 shrink-0">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      {p.brand ? <p className="text-xs uppercase tracking-widest text-app-muted">{p.brand}</p> : null}
                      <p className="font-medium leading-snug line-clamp-2">{localized(p.title, 'fr')}</p>
                      {p.market_price ? (
                        <p className="text-xs text-app-muted mt-1">Marché : {formatPrice(p.market_price, p.currency)}</p>
                      ) : (
                        <p className="text-xs text-app-accent mt-1">Prix marché non vérifié</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <label className="space-y-1">
                      <span className="text-[10px] text-app-muted uppercase">Prix outlet</span>
                      <input name="outletPrice" type="number" step="0.01" defaultValue={p.outlet_price ?? ''} className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-2 py-1.5" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-app-muted uppercase">Quantité</span>
                      <input name="quantity" type="number" defaultValue="1" className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-2 py-1.5" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-app-muted uppercase">État</span>
                      <select name="condition" className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-2 py-1.5">
                        <option value="new">Neuf</option>
                        <option value="like_new">Comme neuf</option>
                        <option value="box_damaged">Boîte abîmée</option>
                      </select>
                    </label>
                  </div>
                  <button className="btn-rush w-full">Publier</button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Gestion de tous les scans */}
      <ScanManager scans={scans ?? []} />
    </main>
  );
}
