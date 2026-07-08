import Link from 'next/link';
import RegieNav from '@/components/admin/RegieNav';

const NAV = [
  { href: '/ops', label: 'La régie' },
  { href: '/ops/scan', label: 'Le pupitre de scan' },
  { href: '/ops/scan/queue', label: 'La file de validation' },
  { href: '/ops/stock', label: 'Le cabinet des stocks' },
  { href: '/ops/flash', label: 'Les vacations' },
];

export default function OpsLayout({ children }) {
  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <aside className="regie-aside md:w-60 shrink-0 border-b md:border-b-0 md:border-r p-4 md:p-6 space-y-6">
        <Link href="/" className="font-display font-extrabold text-xl block">
          OUT<span className="text-app-loot">RUSH</span>
          <span className="regie-sub block text-[10px] mt-1">LA RÉGIE</span>
        </Link>
        <RegieNav items={NAV} />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
