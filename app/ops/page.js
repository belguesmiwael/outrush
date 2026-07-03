import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OpsHome() {
  const supabase = await createClient();
  const [{ count: readyCount }, { count: dormantCount }, { count: publishedCount }] = await Promise.all([
    supabase.from('scan_events').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('stock_class', 'dormant'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  const stats = [
    { label: 'Fiches prêtes à valider', value: readyCount ?? 0, href: '/ops/scan/queue', accent: true },
    { label: 'Produits dormants', value: dormantCount ?? 0, href: '/ops/stock' },
    { label: 'Produits en ligne', value: publishedCount ?? 0, href: '/' },
  ];

  return (
    <main className="p-6 md:p-10 space-y-8">
      <h1 className="font-display font-bold text-3xl">Command-Center</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <a key={s.label} href={s.href} className="card-hunt rise-in p-6 block" style={{ animationDelay: `${i * 60}ms` }}>
            <p className={`font-display font-extrabold text-4xl ${s.accent ? 'text-app-accent' : ''}`}>{s.value}</p>
            <p className="text-app-muted text-sm mt-2">{s.label}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
