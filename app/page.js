import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import { formatPrice, discountPct } from '@/lib/utils';
import { pickDailyRush, secondsUntilRotation } from '@/lib/rush/daily';
import Countdown from '@/components/shop/Countdown';
import RotationTimer from '@/components/shop/RotationTimer';
import LiveStockGauge from '@/components/shop/LiveStockGauge';
import ProductCard from '@/components/shop/ProductCard';
import PriceReveal from '@/components/shop/PriceReveal';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import Hero from '@/components/shop/Hero';
import Reveal from '@/components/shop/Reveal';

export const revalidate = 60;

export default async function HomePage() {
  const locale = 'fr';
  const supabase = await createClient();
  const serverNow = new Date().toISOString();

  const [{ data: flash }, { data: products }, { data: bestSellers }, { data: packs }, { data: categories }] = await Promise.all([
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
      .select('id, slug, title, brand, images, market_price, outlet_price, currency, category_id, quantity')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('products')
      .select('id, slug, title, brand, images, market_price, outlet_price, currency')
      .eq('status', 'published')
      .order('velocity_14d', { ascending: false })
      .limit(12),
    supabase
      .from('packs')
      .select('id, slug, title, narrative, composed_img, pack_price, pack_items(qty, product:products(outlet_price))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('categories')
      .select('id, slug, name, universe, parent_id')
      .order('slug', { ascending: true }),
  ]);

  // Meilleure remise du catalogue → mise en avant hero
  const topDeal = (products ?? [])
    .map((p) => ({ p, pct: discountPct(p.market_price, p.outlet_price) ?? 0 }))
    .sort((a, b) => b.pct - a.pct)[0];
  // Le Rush du jour : sélection déterministe qui tourne chaque nuit
  const dailyRush = pickDailyRush(
    (products ?? []).filter((p) => (p.quantity ?? 1) > 0),
    8
  );
  const rotationSeconds = secondsUntilRotation();
  // Catégories racines (univers) pour le bandeau dense
  const rootCategories = (categories ?? []).filter((c) => !c.parent_id);
  const catById = new Map((categories ?? []).map((c) => [c.id, c]));

  return (
    <main className="min-h-dvh">
      <SiteHeader categories={rootCategories} locale={locale} />

      <Hero product={topDeal?.p ?? null} pct={topDeal?.pct ?? 0} locale={locale} />

      {/* DAILY RUSH — le flux qui disparaît */}
      {dailyRush.length ? (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl flex items-center gap-3">
                Daily Rush
                <span className="text-[10px] uppercase tracking-[0.3em] text-app-accent border border-app-accent/40 rounded-full px-2 py-1">
                  aujourd'hui
                </span>
              </h2>
              <p className="text-app-muted text-sm mt-1">
                Une sélection qui change chaque jour. Ces pièces partent, d'autres arrivent.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-app-muted">Renouvellement dans</span>
              <RotationTimer initialSeconds={rotationSeconds} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dailyRush.map((p, i) => (
              <ProductCard key={p.id} product={p} locale={locale} index={i} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/rush"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-display font-bold bg-app-surface border border-white/10 hover:border-app-accent hover:text-app-accent transition-colors duration-120"
            >
              ▶ Entrer dans le Flux — mode plein écran
            </Link>
          </div>
        </section>
      ) : null}

      {/* Bandeau CATÉGORIES dense */}
      {rootCategories.length ? (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {rootCategories.map((c, i) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="card-hunt rise-in p-4 text-center hover:ring-1 hover:ring-[color:var(--app-accent)]/40 transition-all duration-[220ms]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="font-display font-bold text-lg">{localized(c.name, locale)}</div>
                <div className="text-xs text-app-muted mt-1 capitalize">{c.universe}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* BEST-SELLERS — rail dense horizontal */}
      {bestSellers?.length ? (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display font-bold text-2xl">Les plus chassés</h2>
            <span className="text-sm text-app-muted">tendances en ce moment</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
            {bestSellers.map((p, i) => (
              <div key={p.id} className="snap-start shrink-0 w-40 sm:w-44">
                <ProductCard product={p} locale={locale} index={i} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

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

      {/* Bannière SURPRISE BOX */}
      <section className="max-w-7xl mx-auto px-4 pt-10">
        <Link
          href="/surprise-box"
          className="card-hunt block p-8 md:p-10 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(ellipse at 50% 0%, oklch(62% 0.24 25 / 0.15), transparent 60%)' }} />
          <div className="relative space-y-3">
            <div className="text-4xl">🎁</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl">Surprise Box</h2>
            <p className="text-app-muted max-w-md mx-auto">
              Choisissez un budget, l'IA compose une box mystère d'une valeur toujours supérieure.
            </p>
            <span className="inline-block mt-2 text-app-accent font-medium group-hover:translate-x-1 transition-transform duration-220">
              Composer ma box →
            </span>
          </div>
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="font-display font-bold text-3xl mb-2">Tout le catalogue</h2>
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
            <p className="text-sm text-app-muted">
              Côté admin ? <Link href="/admin/products/new" className="text-app-accent">Ajoutez le premier produit</Link>.
            </p>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
