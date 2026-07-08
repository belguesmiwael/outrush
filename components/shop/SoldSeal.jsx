// LA CRIÉE — le cachet « ADJUGÉ · VENDU ».
// Un lot épuisé n'est pas grisé : il reçoit un cachet à la cire laiton, frappé
// en diagonale. Le sold-out devient PREUVE DE DÉSIR (« zut, je l'ai raté »),
// aspirationnel et non plus mort. Server-safe.
//
// variant="won"  → « ADJUGÉ · À VOUS » (acquisition réussie par l'acheteur)
// variant="sold" → « ADJUGÉ · VENDU » (le lot est parti)

export default function SoldSeal({ variant = 'sold', slam = true, className = '' }) {
  const won = variant === 'won';
  return (
    <span
      className={`seal-adjuge ${slam ? 'seal-slam' : ''} ${className}`}
      role="img"
      aria-label={won ? 'Adjugé, à vous' : 'Adjugé, vendu'}
    >
      <span className="seal-adjuge-main">Adjugé</span>
      <span className="seal-adjuge-sub">· {won ? 'À VOUS' : 'VENDU'} ·</span>
    </span>
  );
}
