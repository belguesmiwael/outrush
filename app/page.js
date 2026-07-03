import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';
import Countdown from '@/components/shop/Countdown';
import LiveStockGauge from '@/components/shop/LiveStockGauge';
import ProductCard from '@/components/shop/ProductCard';
import PriceReveal from '@/components/shop/PriceReveal';

export const revalidate = 60;

export default async function HomePage() {
  const locale = 'fr';
  const supabase = await createClient();
  const serverNow = new Date().toISOString();

  const [{ data: flash }, { data: products }, { data: packs }] = await Promise.all([
    supabase
      .from('flash_sales')
      .select('id, title, ends_at, flash_sale_items(id, flash_price, allocated_qty, remaining_qty, product:products(slug, title, brand, images, market_price, outlet_price, currency))')
      .lte('starts_at', serverNow)
      .gte('ends_at', serverNow)
      .order('ends_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('products')
      .select('id, slug, title, brand, images, market_price, outlet_price, currency')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('packs')
      .select('id, slug, title, narrative, composed_img, pack_price, pack_items(qty, product:products(outlet_price))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  return (
    <main className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5" style={{ background: 'oklch(16% 0.015 260 / 0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-display font-extrabold text-2xl tracking-tight">
            OUT<span className="text-app-accent">RUSH</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/flash" className="hover:text-app-accent transition-colors duration-120">Flash</Link>
            <Link href="/login" className="hover:text-app-accent transition-colors duration-120">Compte</Link>
          </nav>
        </div>
      </header>

      {/* Rail FLASH */}
      {flash ? (
        <section className="border-b border-white/5" style={{ background: 'linear-gradient(180deg, oklch(62% 0.24 25 / 0.08), transparent)' }}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-accent" />
                </span>
                <h2 className="font-display font-bold text-app-accent uppercase tracking-widest text-sm">
                  {t(locale, 'flash_now')} — {localized(flash.title, locale)}
                </h2>
              </div>
              <div className="flex items-baseline gap-2 text-app-muted text-sm">
                <span>{t(locale, 'ends_in')}</span>
                <Countdown endsAt={flash.ends_at} serverNow={serverNow} className="text-2xl text-app-text" />
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
              {(flash.flash_sale_items ?? []).filter((i) => i.product).map((item) => (
                <Link
                  key={item.id}
                  href={`/product/${item.product.slug}`}
                  className="card-hunt snap-start shrink-0 w-56 p-4 space-y-3"
                >
                  <p className="font-medium line-clamp-2 text-sm">{localized(item.product.title, locale)}</p>
                  <PriceReveal
                    marketPrice={item.product.market_price}
                    outletPrice={item.flash_price}
                    currency={item.product.currency}
                    locale={locale}
                  />
                  <LiveStockGauge
                    itemId={item.id}
                    allocated={item.allocated_qty}
                    initialRemaining={item.remaining_qty}
                    label={{ lastPiece: t(locale, 'last_piece'), left: t(locale, 'stock_left') }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Mur Card-Gallery */}
      {/* Rail PACKS — les mariages du laboratoire */}
      {packs?.length ? (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <h2 className="font-display font-bold text-3xl mb-2">Packs du laboratoire</h2>
          <p className="text-app-muted mb-6">Des pièces mariées pour aller ensemble — moins cher qu'à l'unité.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pk, i) => {
              const sumOutlet = (pk.pack_items ?? []).reduce(
                (s, it) => s + Number(it.product?.outlet_price ?? 0) * it.qty, 0);
              const pct = sumOutlet > 0
                ? Math.round(((sumOutlet - Number(pk.pack_price)) / sumOutlet) * 100)
                : 0;
              const img = pk.composed_img
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${pk.composed_img}`
                : null;
              return (
                <Link key={pk.id} href={`/pack/${pk.slug}`}
                  className="card-hunt rise-in overflow-hidden group"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="aspect-[3/2] bg-app-surface-2 relative overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.03]" />
                    ) : null}
                    {pct > 0 ? <span className="seal absolute top-3 left-3">PACK −{pct}%</span> : null}
                  </div>
                  <div className="p-4">
                    <p className="font-medium leading-snug line-clamp-1">{localized(pk.title, locale)}</p>
                    <p className="text-app-accent font-display font-bold mt-1">{formatPrice(pk.pack_price, 'USD', locale)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="font-display font-bold text-3xl mb-2">La chasse est ouverte</h2>
        <p className="text-app-muted mb-8">Prix réels vérifiés multi-sources. Remises scellées, pas promises.</p>
        {products?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} locale={locale} index={i} />
            ))}
          </div>
        ) : (
          <div className="card-hunt p-16 text-center space-y-3">
            <div className="font-display text-6xl text-app-accent opacity-40 select-none">⏱</div>
            <p className="text-app-muted">{t(locale, 'hunt_empty')}</p>
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-8 text-sm text-app-muted flex flex-wrap gap-6 justify-between">
          <p>© {new Date().getFullYear()} OUTRUSH — l'outlet mondial, chronométré.</p>
          <p>FR · EN · AR — multi-devises</p>
        </div>
      </footer>
    </main>
  );
}
