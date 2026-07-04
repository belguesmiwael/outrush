import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <p className="font-display font-extrabold text-2xl">OUT<span className="text-app-accent">RUSH</span></p>
            <p className="text-app-muted text-sm max-w-xs">
              L'outlet mondial, chronométré. Des opportunités qui disparaissent, jamais un catalogue.
            </p>
          </div>
          <FooterCol title="Explorer" links={[['Le Flux', '/rush'], ['Ventes Flash', '/flash'], ['Surprise Box', '/surprise-box']]} />
          <FooterCol title="Catégories" links={[['Beauté', '/category/beaute'], ['Mode', '/category/mode'], ['Tech', '/category/tech'], ['Maison', '/category/maison']]} />
          <FooterCol title="Compte" links={[['Se connecter', '/login'], ['Créer un compte', '/login']]} />
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-3 text-sm text-app-muted">
          <span>© 2026 OUTRUSH — prix réels vérifiés, remises scellées.</span>
          <span>FR · EN · AR — multi-devises</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="space-y-3">
      <p className="eyebrow text-app-muted" style={{ color: 'var(--app-text-muted)' }}>{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-app-muted hover:text-app-accent transition-colors duration-220">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
