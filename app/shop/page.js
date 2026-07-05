import { createClient } from '@/lib/supabase/server';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import ProductCard from '@/components/shop/ProductCard';
import { getActiveFlashMap, withFlash } from '@/lib/flash/active';
import ShopFilters from '@/components/shop/ShopFilters';
import CategoryIcon from '@/components/shop/CategoryIcon';
import Link from 'next/link';
import { localized } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

const SORT_MAP = {
  trending: ['velocity_14d', false],
  newest: ['created_at', false],
  discount: null, // trié en mémoire
  price_asc: ['outlet_price', true],
  price_desc: ['outlet_price', false],
};

export default async function ShopPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { q = '', cat = '', sort = 'trending', min = '', max = '' } = sp;
  const locale = 'fr';
  const supabase = await createClient();

  const [{ data: categories }, { data: salesData }] = await Promise.all([
    supabase.from('categories').select('id, slug, name, icon').order('slug'),
    supabase.rpc('sales_last_24h'),
  ]);
  const soldById = new Map((salesData ?? []).map((r) => [r.product_id, Number(r.sold)]));

  let query = supabase
    .from('products')
    .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity, velocity_14d, views, description, category_id, created_at')
    .eq('status', 'published')
    .gt('quantity', 0)
    .limit(60);

  if (cat && cat !== 'all') {
    const catRow = (categories ?? []).find((c) => c.slug === cat);
    if (catRow) query = query.eq('category_id', catRow.id);
  }
  if (q) query = query.or(`brand.ilike.%${q}%,title->>fr.ilike.%${q}%`);
  if (min) query = query.gte('outlet_price', Number(min));
  if (max) query = query.lte('outlet_price', Number(max));

  const order = SORT_MAP[sort];
  if (order) query = query.order(order[0], { ascending: order[1], nullsFirst: false });

  let { data: products } = await query;
  products = products ?? [];
  const flashMap = await getActiveFlashMap();
  products = products.map((p) => withFlash(p, flashMap));

  // Tri par remise en mémoire
  if (sort === 'discount') {
    products.sort((a, b) => {
      const da = a.market_price ? (a.market_price - a.outlet_price) / a.market_price : 0;
      const db = b.market_price ? (b.market_price - b.outlet_price) / b.market_price : 0;
      return db - da;
    });
  }

  return (
    <main className="min-h-dvh">
      <SiteHeader categories={(categories ?? []).slice(0, 12)} locale={locale} />

      <section className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl">La boutique</h1>
          <div className="rule-accent mt-2" />
        </div>

        {/* Puces catégories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Link href="/shop" className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors duration-120 ${!cat || cat === 'all' ? 'bg-app-accent text-white' : 'bg-white/5 text-app-muted hover:text-app-text'}`}>
            Tout
          </Link>
          {(categories ?? []).map((c) => (
            <Link key={c.id} href={`/shop?cat=${c.slug}`}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors duration-120 ${cat === c.slug ? 'bg-app-accent text-white' : 'bg-white/5 text-app-muted hover:text-app-text'}`}>
              <CategoryIcon name={c.icon} className="w-3.5 h-3.5" strokeWidth={2} />
              {localized(c.name, locale)}
            </Link>
          ))}
        </div>

        <ShopFilters categories={categories ?? []} locale={locale} current={{ q, cat, sort, min, max }} />

        {products.length === 0 ? (
          <div className="card-premium p-16 text-center text-app-muted">
            Aucun produit ne correspond. Élargissez votre recherche.
          </div>
        ) : (
          <>
            <p className="text-sm text-app-muted">{products.length} produit{products.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} locale={locale} index={i} sold={soldById.get(p.id) ?? 0} />
              ))}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
