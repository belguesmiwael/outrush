import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import OrderNotifier from '@/components/admin/OrderNotifier';

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/scan', label: 'Scanner' },
  { href: '/admin/products', label: 'Produits' },
  { href: '/admin/orders', label: 'Commandes' },
  { href: '/admin/products/new', label: '+ Nouveau produit' },
  { href: '/ops/stock', label: 'Stock Intelligence' },
  { href: '/admin/flash', label: 'Ventes Flash' },
  { href: '/admin/settings', label: 'Réglages' },
];

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { count: pending } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <aside
        className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 space-y-6"
        style={{ background: 'oklch(14% 0.015 260)' }}
      >
        <Link href="/" className="font-display font-extrabold text-xl block">
          OUT<span className="text-app-accent">RUSH</span>
          <span className="block text-[10px] tracking-[0.3em] text-app-muted font-body font-normal mt-1">
            ADMINISTRATION
          </span>
        </Link>
        <OrderNotifier initialPending={pending ?? 0} />
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-2 rounded-lg text-sm whitespace-nowrap text-app-muted hover:text-app-text hover:bg-app-surface transition-colors duration-120"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
