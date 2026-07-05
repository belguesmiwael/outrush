'use client';
import { useState, useTransition } from 'react';
import { applyPhotoStudio, enrichGallery } from '@/lib/actions/admin-products';

const LABELS = {
  no_image: 'Aucune image à traiter',
  download_failed: 'Image introuvable',
  studio_failed: 'Détourage impossible (vérifiez la clé Gemini)',
  upload_failed: 'Échec de l\'enregistrement',
  no_gtin: 'Pas de code-barres pour trouver des images',
  no_images_found: 'Aucune image officielle trouvée',
  invalid: 'Requête invalide',
};

function fd(productId) {
  const f = new FormData();
  f.set('productId', productId);
  return f;
}

export default function ProductImageActions({ productId, hasImage, hasGtin }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const [busy, setBusy] = useState(null);

  function run(kind) {
    setBusy(kind); setMsg(null);
    start(async () => {
      try {
        const res = kind === 'studio'
          ? await applyPhotoStudio(fd(productId))
          : await enrichGallery(fd(productId));
        if (res?.ok) {
          setMsg({ type: 'ok', text: kind === 'studio' ? 'Studio appliqué ✓' : `+${res.added ?? 0} image(s) ✓` });
        } else {
          setMsg({ type: 'err', text: LABELS[res?.error] ?? 'Échec' });
        }
      } catch {
        setMsg({ type: 'err', text: 'Erreur serveur' });
      } finally {
        setBusy(null);
        setTimeout(() => setMsg(null), 4000);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {hasImage ? (
        <button
          onClick={() => run('studio')}
          disabled={pending}
          className="text-xs px-2.5 py-1.5 rounded-lg text-app-loot border border-[color:var(--app-loot)]/30 hover:bg-[color:var(--app-loot)]/10 disabled:opacity-50 transition-colors duration-120"
          title="Détoure la vraie photo et la pose sur un fond signature OUTRUSH"
        >
          {busy === 'studio' ? 'Studio…' : '✨ Studio'}
        </button>
      ) : null}
      {hasGtin ? (
        <button
          onClick={() => run('gallery')}
          disabled={pending}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-app-surface disabled:opacity-50 transition-colors duration-120"
          title="Télécharge les images officielles du produit (via code-barres)"
        >
          {busy === 'gallery' ? 'Galerie…' : '🖼 Galerie'}
        </button>
      ) : null}
      {msg ? (
        <span className={`text-[11px] ${msg.type === 'ok' ? 'text-app-success' : 'text-app-accent'}`}>
          {msg.text}
        </span>
      ) : null}
    </div>
  );
}
