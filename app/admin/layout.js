import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import OrderNotifier from '@/components/admin/OrderNotifier';
import RegieNav from '@/components/admin/RegieNav';

const NAV = [
  { href: '/admin', label: 'Le bureau' },
  { href: '/admin/scan', label: 'Scanner' },
  { href: '/admin/products', label: 'Produits' },
  { href: '/admin/orders', label: 'Commandes' },
  { href: '/admin/products/new', label: '+ Cataloguer un produit' },
  { href: '/admin/stock', label: 'Stock Intelligence' },
  { href: '/admin/flash', label: 'Vacations' },
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
      <aside className="regie-aside md:w-60 shrink-0 border-b md:border-b-0 md:border-r p-4 md:p-6 space-y-6">
        <Link href="/" className="font-display font-extrabold text-xl block">
          OUT<span className="text-app-loot">RUSH</span>
          <span className="regie-sub block text-[10px] mt-1">LE BUREAU</span>
        </Link>
        <OrderNotifier initialPending={pending ?? 0} />
        <RegieNav items={NAV} />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
