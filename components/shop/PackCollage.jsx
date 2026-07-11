import Image from 'next/image';

/**
 * LA CRIÉE — collage d'un LOT : les vraies images produit couvrent toute la zone
 * de la carte, mariées avec élégance : un fond flouté (ambiance) + une mosaïque
 * nette des pièces + un voile velours/laiton qui unifie le tout.
 * @param images URLs (déjà résolues) des images produit du lot.
 */
export default function PackCollage({ images = [] }) {
  const imgs = images.filter(Boolean).slice(0, 4);
  if (!imgs.length) return <div className="vitrine-fallback" aria-hidden="true" />;
  const n = imgs.length;

  return (
    <div className="pack-collage">
      {/* Fond flouté : ambiance tirée de la 1re pièce */}
      <Image src={imgs[0]} alt="" fill sizes="(max-width:640px) 100vw, 33vw" className="pack-collage-bg" />
      {/* Mosaïque nette des pièces */}
      <div className="pack-collage-grid" data-n={n}>
        {imgs.map((src, i) => (
          <div key={i} className="pack-collage-cell">
            <Image src={src} alt="" fill sizes="180px" className="object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
