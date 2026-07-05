import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import Countdown from '@/components/shop/Countdown';
import LiveStockGauge from '@/components/shop/LiveStockGauge';
import Money from '@/components/shop/Money';

export const dynamic = 'force-dynamic';

export default async function FlashPage() {
  const locale = 'fr';
  const supabase = await createClient();
  const serverNow = new Date().toISOString();
  // Un drop est visible s'il est dans sa fenêtre horaire, OU marqué 'live' manuellement
  const { data: allSales } = await supabase
    .from('flash_sales')
    .select('id, title, ends_at, starts_at, status, flash_sale_items(id, flash_price, allocated_qty, remaining_qty, product:products(slug, title, brand, images, market_price, outlet_price, currency))')
    .in('status', ['live', 'scheduled'])
    .gte('ends_at', serverNow)
    .order('ends_at', { ascending: true });
  const sales = (allSales ?? []).filter(
    (s) => s.status === 'live' || (s.starts_at <= serverNow && s.ends_at >= serverNow)
  );

  return (
    <main className="min-h-dvh max-w-7xl mx-auto px-4 py-8 space-y-10">
      <Link href="/" className="text-sm text-app-muted hover:text-app-text transition-colors duration-120">← OUTRUSH</Link>
      {(sales ?? []).length === 0 ? (
        <div className="card-hunt p-16 text-center space-y-3">
          <div className="font-display text-6xl text-app-accent opacity-40 select-none">⏱</div>
          <p className="text-app-muted">{t(locale, 'hunt_empty')}</p>
        </div>
      ) : (
        sales.map((sale) => (
          <section key={sale.id} className="space-y-6">
            <div className="text-center space-y-2 py-6">
              <h1 className="font-display font-extrabold text-4xl">{localized(sale.title, locale)}</h1>
              <Countdown endsAt={sale.ends_at} serverNow={serverNow} className="text-6xl text-app-accent" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(sale.flash_sale_items ?? []).filter((i) => i.product).map((item, idx) => {
                const img = (item.product.images ?? [])[0];
                const imgUrl = img
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${img}`
                  : null;
                const pct = item.product.market_price
                  ? Math.round((1 - item.flash_price / item.product.market_price) * 100)
                  : null;
                return (
                  <Link key={item.id} href={`/product/${item.product.slug}`}
                    className="card-premium rise-in group flex flex-col overflow-hidden" style={{ animationDelay: `${idx * 50}ms` }}>
                    {/* Image plein cadre + halo de chaleur */}
                    <div className="relative aspect-product overflow-hidden bg-app-surface-2">
                      <div className="absolute inset-0 opacity-70 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, oklch(62% 0.24 25 / 0.18), transparent 70%)' }} />
                      {imgUrl ? (
                        <img src={imgUrl} alt={localized(item.product.title, locale)}
                          loading="lazy"
                          className="relative w-full h-full object-contain p-3 transition-transform duration-[600ms] ease-out-expo group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-app-muted font-display text-4xl select-none">O</div>
                      )}
                      {/* Sceau remise laiton, en haut à droite */}
                      {pct !== null ? (
                        <span className="absolute top-2 right-2 seal text-xs">−{pct}%</span>
                      ) : null}
                      {/* Marqueur flash pulsant, en haut à gauche */}
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/50 backdrop-blur text-app-accent">
                        <span className="w-1.5 h-1.5 rounded-full bg-app-accent pulse-last" /> Flash
                      </span>
                    </div>
                    {/* Infos */}
                    <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                      {item.product.brand ? (
                        <p className="text-[10px] uppercase tracking-widest text-app-muted truncate">{item.product.brand}</p>
                      ) : null}
                      <p className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.4em]">{localized(item.product.title, locale)}</p>
                      <div className="mt-auto space-y-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {item.product.market_price ? (
                            <s className="num text-app-muted text-xs"><Money amount={item.product.market_price} /></s>
                          ) : null}
                          <span className="num-tension text-lg font-semibold"><Money amount={item.flash_price} /></span>
                        </div>
                        <LiveStockGauge itemId={item.id} allocated={item.allocated_qty}
                          initialRemaining={item.remaining_qty}
                          label={{ lastPiece: t(locale, 'last_piece'), left: t(locale, 'stock_left') }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
