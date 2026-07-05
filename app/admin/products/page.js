import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { setProductStatus, deleteProduct } from '@/lib/actions/admin-products';
import ProductImageActions from '@/components/admin/ProductImageActions';
import { ProductSelectProvider, ProductCheckbox, BulkActionBar } from '@/components/admin/ProductBulkSelect';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice, discountPct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = {
  published: ['En ligne', 'var(--app-success)'],
  draft: ['Brouillon', 'var(--app-text-muted)'],
  pending_review: ['En revue', 'var(--app-text)'],
  archived: ['Archivé', 'var(--app-text-muted)'],
};

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

export default async function AdminProductsPage({ searchParams }) {
  const { q = '', status = '' } = (await searchParams) ?? {};
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity, status, stock_class, gtin, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  if (q) query = query.ilike('slug', `%${q}%`);

  const { data: products } = await query;
  const { data: categories } = await supabase
    .from('categories').select('id, slug, name').order('slug', { ascending: true });

  return (
    <ProductSelectProvider>
    <main className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold text-3xl">Produits</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg px-4 py-2.5 font-display font-bold text-sm bg-app-accent text-white transition-transform duration-120 hover:scale-[1.02] active:scale-95"
        >
          + Nouveau produit
        </Link>
      </div>

      {/* Filtres */}
      <form className="flex gap-3 flex-wrap items-end">
        <label className="space-y-1 text-sm">
          <span className="text-app-muted block">Recherche (slug)</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="ex: dior-serum"
            className="rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-app-muted block">Statut</span>
          <select name="status" defaultValue={status} className="rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm">
            <option value="">Tous</option>
            <option value="published">En ligne</option>
            <option value="draft">Brouillon</option>
            <option value="pending_review">En revue</option>
            <option value="archived">Archivé</option>
          </select>
        </label>
        <button className="rounded-lg px-4 py-2 text-sm border border-white/10 hover:bg-app-surface transition-colors duration-120">
          Filtrer
        </button>
      </form>

      {(products ?? []).length === 0 ? (
        <div className="card-hunt p-16 text-center space-y-3">
          <div className="font-display text-5xl text-app-accent opacity-40">📦</div>
          <p className="text-app-muted">Aucun produit. Créez le premier pour remplir la boutique.</p>
          <Link href="/admin/products/new" className="inline-block text-app-accent font-medium">
            + Nouveau produit
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const img = mediaUrl((p.images ?? [])[0]);
            const [label, color] = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
            const pct = discountPct(p.market_price, p.outlet_price);
            return (
              <div key={p.id} className="card-hunt p-3 flex items-center gap-4">
                <ProductCheckbox id={p.id} />
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-app-surface-2 shrink-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {p.brand ? `${p.brand} — ` : ''}{localized(p.title, 'fr')}
                  </p>
                  <p className="text-xs text-app-muted mt-0.5">
                    {formatPrice(p.outlet_price, p.currency)}
                    {pct ? <span className="text-app-accent"> · −{pct}%</span> : null} · {p.quantity} u. ·{' '}
                    <span style={{ color }}>{label}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status !== 'published' ? (
                    <form action={setProductStatus}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="status" value="published" />
                      <button className="text-xs px-2 py-1.5 rounded-lg text-app-success hover:bg-app-surface transition-colors duration-120" title="Publier">
                        Publier
                      </button>
                    </form>
                  ) : (
                    <form action={setProductStatus}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button className="text-xs px-2 py-1.5 rounded-lg text-app-muted hover:bg-app-surface transition-colors duration-120" title="Dépublier">
                        Masquer
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-app-surface transition-colors duration-120"
                  >
                    Éditer
                  </Link>
                  <ProductImageActions
                    productId={p.id}
                    product={{ id: p.id, title: p.title, brand: p.brand, images: p.images ?? [] }}
                    hasImage={(p.images ?? []).length > 0}
                    hasGtin={Boolean(p.gtin)}
                  />
                  <form action={deleteProduct}>
                    <input type="hidden" name="productId" value={p.id} />
                    <button className="text-xs px-2 py-1.5 rounded-lg text-app-muted hover:text-app-accent transition-colors duration-120" title="Supprimer / archiver">
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BulkActionBar categories={categories ?? []} />
    </main>
    </ProductSelectProvider>
  );
}
