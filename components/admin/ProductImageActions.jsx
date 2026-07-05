'use client';
import { useState, useTransition } from 'react';
import { enrichGallery } from '@/lib/actions/admin-products';
import StudioModal from './StudioModal';

const LABELS = {
  no_gtin: 'Pas de code-barres pour trouver des images',
  no_images_found: 'Aucune image officielle trouvée',
  invalid: 'Requête invalide',
};

function fd(productId) {
  const f = new FormData();
  f.set('productId', productId);
  return f;
}

export default function ProductImageActions({ productId, product, hasImage, hasGtin }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const [studioOpen, setStudioOpen] = useState(false);

  function runGallery() {
    setBusy('gallery'); setMsg(null);
    start(async () => {
      try {
        const res = await enrichGallery(fd(productId));
        if (res?.ok) setMsg({ type: 'ok', text: `+${res.added ?? 0} image(s) ✓` });
        else setMsg({ type: 'err', text: LABELS[res?.error] ?? 'Échec' });
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
          onClick={() => setStudioOpen(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg text-app-loot border border-[color:var(--app-loot)]/30 hover:bg-[color:var(--app-loot)]/10 transition-colors duration-120"
          title="Ouvre le studio : met en scène ta vraie photo sur un fond signature OUTRUSH"
        >
          ✨ Studio
        </button>
      ) : null}
      {hasGtin ? (
        <button
          onClick={runGallery}
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

      {studioOpen ? (
        <StudioModal
          product={product ?? { id: productId, images: [], title: {} }}
          onClose={(saved) => { setStudioOpen(false); if (saved) setMsg({ type: 'ok', text: 'Studio enregistré ✓' }); }}
        />
      ) : null}
    </div>
  );
}
