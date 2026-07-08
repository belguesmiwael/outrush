'use client';
import { useState } from 'react';
import Link from 'next/link';

/**
 * LA CRIÉE — vitrine éditoriale plein cadre.
 * L'image vit dans le bucket public `product-media` sous `site/<name>`.
 * TANT QU'ELLE N'EST PAS UPLOADÉE : un placeholder velours+laiton s'affiche
 * (voulu, jamais « cassé »). Le texte est en HTML par-dessus — jamais gravé
 * dans l'image (mobile, i18n FR/EN/AR, SEO, animations).
 *
 * @param image  chemin dans le bucket, ex. "site/vitrine-luxe.jpg" (optionnel)
 * @param align  "left" (scrim latéral) | "center" (scrim radial)
 * @param height classes tailwind de hauteur
 */
export default function EditorialVitrine({
  image,
  align = 'left',
  height = 'h-[380px] md:h-[460px]',
  eyebrow,
  title,
  subtitle,
  cta,
  href,
  children,
}) {
  const [broken, setBroken] = useState(false);
  const src = image
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${image}`
    : null;
  const showImg = src && !broken;

  const content = (
    <>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="vitrine-media" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="vitrine-fallback" aria-hidden="true" />
      )}
      <div className={`vitrine-scrim ${align === 'center' ? 'vitrine-scrim-center' : ''}`} />

      <div className={`relative z-10 h-full flex flex-col justify-center gap-4 px-7 md:px-14 ${
        align === 'center' ? 'items-center text-center' : 'items-start max-w-2xl'
      }`}>
        {eyebrow ? <p className="eyebrow eyebrow-hot">{eyebrow}</p> : null}
        {title ? (
          <h2 className="display-hero text-3xl md:text-5xl leading-[1.02]">{title}</h2>
        ) : null}
        {subtitle ? <p className="text-app-muted text-base md:text-lg max-w-md leading-relaxed">{subtitle}</p> : null}
        {children}
        {cta && href ? (
          <span className="btn-hammer mt-2 px-6 py-3 pointer-events-none">{cta}</span>
        ) : null}
      </div>
    </>
  );

  const cls = `vitrine ${height} block`;
  return href ? (
    <Link href={href} className={`${cls} group`}>{content}</Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}
