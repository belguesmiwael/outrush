import { createClient } from '@/lib/supabase/server';
import { publishScannedProduct, incrementDuplicate } from '@/lib/actions/scan';
import { approveSupplierProduct, rejectSupplierProduct } from '@/lib/actions/supplier';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ScanQueuePage() {
  const supabase = await createClient();
  const [{ data: scans }, { data: supplierPending }] = await Promise.all([
    supabase
      .from('scan_events')
      .select('id, code, status, enrichment, created_at, product:products(id, title, brand, market_price, outlet_price, currency, images, condition)')
      .in('status', ['ready', 'duplicate', 'not_found', 'enriching', 'queued'])
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('products')
      .select('id, title, brand, outlet_price, currency, condition, specs, lot:supplier_lots(name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(60),
  ]);

  const ready = (scans ?? []).filter((s) => s.status === 'ready' && s.product);
  const duplicates = (scans ?? []).filter((s) => s.status === 'duplicate');
  const notFound = (scans ?? []).filter((s) => s.status === 'not_found');
  const pending = (scans ?? []).filter((s) => ['enriching', 'queued'].includes(s.status));

  return (
    <main className="p-6 md:p-10 space-y-10">
      <div>
        <h1 className="font-display font-bold text-3xl">File de validation</h1>
        <p className="text-app-muted mt-1">Rien n'est publié sans votre validation. 1 tap = en ligne.</p>
      </div>

      {pending.length ? (
        <p className="text-sm text-app-accent">⏱ {pending.length} scan(s) en cours d'enquête — rafraîchissez dans quelques secondes.</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display font-bold text-xl">Prêtes à publier ({ready.length})</h2>
        {ready.length === 0 ? (
          <div className="card-hunt p-10 text-center text-app-muted">Rien à valider — le viseur attend.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ready.map((scan, i) => {
              const p = scan.product;
              const img = Array.isArray(p.images) && p.images[0]
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${p.images[0]}`
                : null;
              return (
                <form key={scan.id} action={publishScannedProduct} className="card-hunt rise-in p-4 space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
                  <input type="hidden" name="scanId" value={scan.id} />
                  <div className="flex gap-3">
                    <div className="w-20 h-24 rounded-lg overflow-hidden bg-app-surface-2 shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      {p.brand ? <p className="text-xs uppercase tracking-widest text-app-muted">{p.brand}</p> : null}
                      <p className="font-medium leading-snug line-clamp-2">{localized(p.title, 'fr')}</p>
                      <p className="text-xs text-app-muted mt-1 font-mono">{scan.code}</p>
                      {p.market_price ? (
                        <p className="text-xs text-app-muted mt-1">
                          Marché : {formatPrice(p.market_price, p.currency)} · {scan.enrichment?.price_sources_count ?? 0} source(s)
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--app-danger)' }}>Prix marché non vérifié</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-app-muted">Prix outlet</span>
                      <input name="outletPrice" type="number" step="0.01" min="0.5" defaultValue={p.outlet_price} required
                        className="w-full bg-app-surface-2 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-app-accent" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-app-muted">Quantité</span>
                      <input name="quantity" type="number" min="1" defaultValue="1" required
                        className="w-full bg-app-surface-2 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-app-accent" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-app-muted">État</span>
                      <select name="condition" defaultValue={p.condition} className="w-full bg-app-surface-2 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-app-accent">
                        <option value="new">Neuf</option>
                        <option value="like_new">Comme neuf</option>
                        <option value="box_damaged">Boîte abîmée</option>
                      </select>
                    </label>
                  </div>
                  <button className="w-full font-display font-bold py-2.5 rounded-lg bg-app-accent text-white transition-transform duration-120 ease-out-expo active:scale-[0.97]">
                    Publier
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      {duplicates.length ? (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl">Doublons — incrément de stock ({duplicates.length})</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {duplicates.map((scan) => (
              <form key={scan.id} action={incrementDuplicate} className="card-hunt p-4 space-y-3">
                <input type="hidden" name="scanId" value={scan.id} />
                <p className="font-mono text-sm">{scan.code}</p>
                <p className="text-sm text-app-muted">Déjà en catalogue : {scan.enrichment?.duplicate_of ?? scan.product_id}</p>
                <div className="flex gap-2">
                  <input name="quantity" type="number" min="1" defaultValue="1" required
                    className="w-24 bg-app-surface-2 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-app-accent text-sm" />
                  <button className="flex-1 font-display font-bold py-2 rounded-lg border border-app-accent text-app-accent transition-transform duration-120 active:scale-[0.97]">
                    +Stock
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {notFound.length ? (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl">Introuvables ({notFound.length})</h2>
          <div className="space-y-2">
            {notFound.map((scan) => (
              <a
                key={scan.id}
                href={`/ops/scan/manual/${scan.id}`}
                className="card-hunt px-4 py-3 flex items-center justify-between text-sm hover:ring-1 hover:ring-[color:var(--app-accent)]/40 transition-all duration-[220ms]"
              >
                <span className="font-mono">{scan.code}</span>
                <span className="text-app-accent font-medium">Créer la fiche assistée →</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {(supplierPending ?? []).length ? (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl">
            Lots fournisseurs à valider ({supplierPending.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {supplierPending.map((p) => (
              <div key={p.id} className="card-hunt p-4 space-y-3">
                <div className="min-w-0">
                  {p.brand ? (
                    <p className="text-xs uppercase tracking-widest text-app-muted">{p.brand}</p>
                  ) : null}
                  <p className="font-medium leading-snug line-clamp-2">{localized(p.title, 'fr')}</p>
                  <p className="text-xs text-app-muted mt-1">
                    Lot « {p.lot?.name ?? '—'} » · {p.specs?.supplier_declared_qty ?? '?'} u. déclarées ·
                    demande {formatPrice(p.specs?.supplier_asking_price ?? p.outlet_price, p.currency)} ·{' '}
                    {p.condition}
                  </p>
                </div>
                <form action={approveSupplierProduct} className="flex items-end gap-2">
                  <input type="hidden" name="productId" value={p.id} />
                  <label className="flex-1 text-xs text-app-muted space-y-1">
                    Prix outlet
                    <input
                      name="outletPrice"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={p.outlet_price}
                      className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-2 py-2 text-sm text-app-text"
                    />
                  </label>
                  <label className="w-24 text-xs text-app-muted space-y-1">
                    Quantité
                    <input
                      name="quantity"
                      type="number"
                      min="1"
                      required
                      defaultValue={p.specs?.supplier_declared_qty ?? 1}
                      className="w-full rounded-lg bg-app-surface-2 border border-white/8 px-2 py-2 text-sm text-app-text"
                    />
                  </label>
                  <button className="rounded-lg px-4 py-2 text-sm font-display font-bold bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95">
                    Publier
                  </button>
                </form>
                <form action={rejectSupplierProduct}>
                  <input type="hidden" name="productId" value={p.id} />
                  <button className="text-xs text-app-muted hover:text-app-accent transition-colors duration-120">
                    Écarter ce produit
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
