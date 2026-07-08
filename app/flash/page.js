import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import Countdown from '@/components/shop/Countdown';
import FlashCard from '@/components/shop/FlashCard';
import VacationLive from '@/components/shop/VacationLive';
import CartButton from '@/components/shop/CartButton';
import { Gavel, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FlashPage() {
  const locale = 'fr';
  const supabase = await createClient();
  const serverNow = new Date().toISOString();
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
    <main className="min-h-dvh max-w-7xl mx-auto px-4 pb-16 space-y-14">
      {/* Chrome minimal : uniquement retour accueil + panier (immersion vacation) */}
      <div className="sticky top-0 z-50 -mx-4 px-4 h-14 flex items-center justify-between glass safe-t">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-app-muted hover:text-app-text transition-colors duration-120">
          <ArrowLeft size={18} strokeWidth={2} /> Accueil
        </Link>
        <CartButton />
      </div>

      {(sales ?? []).length === 0 ? (
        <div className="card-lot p-16 text-center space-y-4">
          <Gavel size={52} strokeWidth={1.3} className="mx-auto text-app-loot opacity-45" />
          <h1 className="font-display font-bold text-2xl">Aucune vacation en cours</h1>
          <p className="text-app-muted max-w-sm mx-auto">La salle est fermée pour l'instant. La prochaine vacation ouvrira bientôt — revenez pour le coup de marteau.</p>
          <Link href="/shop" className="btn-hammer px-6 py-3 inline-flex mt-2">Parcourir le catalogue</Link>
        </div>
      ) : (
        sales.map((sale) => {
          const liveItems = (sale.flash_sale_items ?? []).filter((i) => i.product);
          return (
            <section key={sale.id} className="space-y-8">
              {/* Le pupitre : titre, chrono laiton géant, la salle */}
              <div className="text-center space-y-4 py-8 relative">
                <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 100% at 50% 0%, oklch(78% 0.13 85 / 0.12), transparent 70%)' }} />
                <p className="eyebrow eyebrow-hot relative">Vacation en direct</p>
                <h1 className="display-hero text-4xl md:text-6xl relative">{localized(sale.title, locale)}</h1>
                <Countdown endsAt={sale.ends_at} serverNow={serverNow} className="chrono-vacation text-6xl md:text-7xl block relative" />
                <div className="relative">
                  <VacationLive saleId={sale.id} endsAt={sale.ends_at} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {liveItems.map((item) => (
                  <FlashCard key={item.id} item={item} locale={locale}
                    labels={{ lastPiece: t(locale, 'last_piece'), left: t(locale, 'stock_left') }} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
