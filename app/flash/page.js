import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import Countdown from '@/components/shop/Countdown';
import FlashCard from '@/components/shop/FlashCard';
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
              {(sale.flash_sale_items ?? []).filter((i) => i.product).map((item) => (
                <FlashCard key={item.id} item={item} locale={locale}
                  labels={{ lastPiece: t(locale, 'last_piece'), left: t(locale, 'stock_left') }} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
