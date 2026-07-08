'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * LA CRIÉE — nav de la régie (backstage). Marque le lien actif via le match
 * de chemin le PLUS LONG (évite que « Scanner » et « La file » soient actifs
 * en même temps sur /ops/scan/queue).
 */
export default function RegieNav({ items = [] }) {
  const pathname = usePathname() || '';

  // Longueur du meilleur match pour chaque item
  const matchLen = (href) => {
    if (pathname === href) return href.length;
    if (pathname.startsWith(href + '/')) return href.length;
    return -1;
  };
  const best = Math.max(...items.map((n) => matchLen(n.href)), -1);

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto">
      {items.map((n) => {
        const active = matchLen(n.href) === best && best >= 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            data-active={active ? 'true' : 'false'}
            className="regie-nav-item px-3 py-2 rounded-lg whitespace-nowrap text-app-muted transition-colors duration-120"
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
