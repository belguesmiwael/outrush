import { createClient } from '@/lib/supabase/server';
import { pickDailyRush, dailySeed } from '@/lib/rush/daily';
import RushFeed from '@/components/shop/RushFeed';

export const dynamic = 'force-dynamic';

export default async function RushPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity')
    .eq('status', 'published')
    .gt('quantity', 0)
    .limit(200);

  // Ordre du jour : déterministe, renouvelé chaque nuit
  const seed = dailySeed();
  const feed = pickDailyRush(products ?? [], 40, seed);

  if (!feed.length) {
    return (
      <main className="min-h-dvh grid place-items-center bg-app-bg text-center p-6">
        <div className="space-y-3">
          <div className="font-display text-6xl text-app-accent opacity-40">⏱</div>
          <p className="text-app-muted">Le flux est vide — le prochain drop arrive.</p>
        </div>
      </main>
    );
  }

  return <RushFeed products={feed} locale="fr" />;
}
