'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body style={{ background: '#14141a', color: '#fff', fontFamily: 'system-ui', padding: '2rem', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Erreur d'affichage</h1>
          <p style={{ opacity: 0.7, fontSize: 14, marginTop: 8 }}>Message technique (copie-le pour diagnostic) :</p>
          <pre style={{ textAlign: 'left', background: 'rgba(0,0,0,0.4)', color: '#e8442e', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {String(error?.message ?? error)}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
            {error?.stack ? `\n\n${error.stack.split('\n').slice(0, 4).join('\n')}` : ''}
          </pre>
          <button onClick={reset} style={{ marginTop: 16, background: '#e8442e', color: '#fff', border: 0, borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
