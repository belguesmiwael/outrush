import Link from 'next/link';
import { ShieldCheck, Truck, BadgeCheck, Gavel, AtSign } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-app-loot/12">
      {/* Rangée de confiance */}
      <div className="border-b border-app-loot/10">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
          <Trust icon={BadgeCheck} title="100 % authentiques" sub="marques d'origine, vérifiées" />
          <Trust icon={Gavel} title="Prix au marteau" sub="sous le marché constaté" />
          <Trust icon={Truck} title="Livraison suivie" sub="expédition par zone" />
          <Trust icon={ShieldCheck} title="Protection acheteur" sub="commande sécurisée" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <p className="font-display font-extrabold text-2xl">OUT<span className="text-app-loot">RUSH</span></p>
            <p className="text-app-muted text-sm max-w-xs leading-relaxed">
              La maison de ventes de l'invendu de luxe. Chaque produit est un lot catalogué,
              chaque drop une vacation — adjugé, à vous.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {/* À pointer vers vos profils réels */}
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
                aria-label="Instagram" className="w-9 h-9 grid place-items-center rounded-full border border-app-loot/20 text-app-muted hover:text-app-loot hover:border-app-loot/50 transition-colors duration-220">
                <AtSign size={16} strokeWidth={2} />
              </a>
              <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer"
                aria-label="TikTok" className="w-9 h-9 grid place-items-center rounded-full border border-app-loot/20 text-app-muted hover:text-app-loot hover:border-app-loot/50 transition-colors duration-220 font-display font-bold text-sm">
                ♪
              </a>
            </div>
          </div>
          <FooterCol title="La salle" links={[['La vacation en cours', '/flash'], ['Le catalogue', '/shop'], ['Le flux', '/rush'], ['Le lot mystère', '/surprise-box']]} />
          <FooterCol title="Les univers" links={[['Beauté', '/category/beaute'], ['Mode', '/category/mode'], ['Tech', '/category/tech'], ['Maison', '/category/maison']]} />
          <FooterCol title="Le carnet" links={[['Se connecter', '/login'], ['Ouvrir un carnet', '/login']]} />
        </div>
        <div className="mt-12 pt-6 border-t border-app-loot/10 flex items-center justify-between flex-wrap gap-3 text-sm text-app-muted">
          <span>© 2026 OUTRUSH — prix marché vérifiés, remises scellées.</span>
          <span>FR · EN · AR — multi-devises</span>
        </div>
      </div>
    </footer>
  );
}

function Trust({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={20} strokeWidth={1.8} className="text-app-loot shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-medium leading-tight">{title}</p>
        <p className="text-app-muted text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="space-y-3">
      <p className="eyebrow" style={{ color: 'var(--app-text-muted)' }}>{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-app-muted hover:text-app-loot transition-colors duration-220">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
