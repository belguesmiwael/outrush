import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ClipboardCheck, Moon, Gavel } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OpsHome() {
  const supabase = await createClient();
  const [{ count: readyCount }, { count: dormantCount }, { count: publishedCount }] = await Promise.all([
    supabase.from('scan_events').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('stock_class', 'dormant'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  const tiles = [
    { k: 'Fiches prêtes au marteau', n: readyCount ?? 0, href: '/ops/scan/queue', icon: ClipboardCheck, hot: true },
    { k: 'Lots dormants', n: dormantCount ?? 0, href: '/ops/stock', icon: Moon },
    { k: 'Lots en salle', n: publishedCount ?? 0, href: '/', icon: Gavel },
  ];

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div>
        <p className="regie-sub text-[10px]">BACKSTAGE DE LA MAISON</p>
        <h1 className="font-display font-bold text-3xl mt-1">La régie</h1>
        <p className="text-app-muted text-sm mt-1">Le poste du commissaire : cataloguer, valider, orchestrer la salle.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {tiles.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.k} href={s.href} className={`regie-tile rise-in p-6 block ${s.hot ? 'tile-hot' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between">
                <p className="tile-n">{s.n}</p>
                <Icon size={20} strokeWidth={1.8} className={s.hot ? 'text-app-accent' : 'text-app-loot'} />
              </div>
              <p className="tile-k mt-3">{s.k}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
