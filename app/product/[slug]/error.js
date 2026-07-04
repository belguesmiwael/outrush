'use client';

export default function ProductError({ error, reset }) {
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="card-premium p-8 max-w-lg space-y-4 text-center">
        <p className="font-display font-bold text-2xl">Oups — cette fiche a un souci</p>
        <p className="text-app-muted text-sm">Le produit existe mais son affichage a rencontré une erreur.</p>
        <pre className="text-left text-xs bg-black/40 rounded-lg p-3 overflow-auto text-app-accent whitespace-pre-wrap">
          {String(error?.message ?? error)}
        </pre>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-rush">Réessayer</button>
          <a href="/" className="btn-ghost">Retour boutique</a>
        </div>
      </div>
    </main>
  );
}
