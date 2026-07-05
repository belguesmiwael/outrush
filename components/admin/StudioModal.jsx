'use client';
import { useState } from 'react';
import { generateStudioPreview, saveStudioImage } from '@/lib/actions/admin-products';

const STYLES = [
  ['velvet', 'Velours', 'Obsidienne chaude + halo vermillon'],
  ['spotlight', 'Projecteur', 'Noir profond, packshot luxe'],
  ['heat', 'Chaleur', 'Vagues vermillon, énergique'],
];

function mediaUrl(path) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}` : null;
}

export default function StudioModal({ product, onClose }) {
  const [style, setStyle] = useState('velvet');
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const original = mediaUrl((product.images ?? [])[0]);

  async function generate() {
    setLoading(true); setError(null); setPreview(null); setNote(null);
    try {
      const fd = new FormData();
      fd.set('productId', product.id);
      fd.set('style', style);
      const res = await generateStudioPreview(fd);
      if (res?.ok) { setPreview(res.dataUrl); setNote(res.note ?? null); }
      else setError(res?.detail ?? res?.error ?? 'Échec de la génération');
    } catch {
      setError('Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!preview) return;
    setSaving(true); setError(null);
    try {
      const fd = new FormData();
      fd.set('productId', product.id);
      fd.set('dataUrl', preview);
      const res = await saveStudioImage(fd);
      if (res?.ok) onClose(true);
      else setError(res?.error ?? 'Échec de l\'enregistrement');
    } catch {
      setError('Erreur serveur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div onClick={() => onClose(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl max-h-[90dvh] overflow-y-auto card-premium p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow-hot">Studio · mise en scène IA</p>
            <h2 className="font-display font-bold text-xl mt-1">{product.title?.fr ?? 'Produit'}</h2>
            <p className="text-app-muted text-sm mt-1">Ta vraie photo, reposée sur un fond signature OUTRUSH. Le produit reste identique.</p>
          </div>
          <button onClick={() => onClose(false)} className="w-9 h-9 grid place-items-center rounded-full glass text-xl leading-none shrink-0">×</button>
        </div>

        {/* Avant / Après */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="eyebrow">Original</p>
            <div className="aspect-square rounded-xl overflow-hidden bg-app-surface-2 border border-white/8">
              {original ? <img src={original} alt="" className="w-full h-full object-contain" /> : null}
            </div>
          </div>
          <div className="space-y-2">
            <p className="eyebrow eyebrow-hot">Aperçu OUTRUSH</p>
            <div className="aspect-square rounded-xl overflow-hidden bg-app-surface-2 border border-[color:var(--app-accent)]/25 grid place-items-center relative">
              {loading ? (
                <div className="text-center space-y-2">
                  <div className="tension-line w-24 mx-auto" />
                  <p className="text-app-muted text-xs">Gemini met en scène…</p>
                </div>
              ) : preview ? (
                <img src={preview} alt="" className="w-full h-full object-contain loot-drop" />
              ) : (
                <p className="text-app-muted text-xs px-4 text-center">Choisis un style puis génère l'aperçu</p>
              )}
            </div>
          </div>
        </div>

        {/* Styles */}
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map(([id, name, desc]) => (
            <button key={id} onClick={() => setStyle(id)}
              className={`rounded-xl border p-3 text-left transition-colors duration-120 ${style === id ? 'border-app-accent bg-[color:var(--app-accent)]/10' : 'border-white/8 hover:border-white/20'}`}>
              <p className="font-display font-bold text-sm">{name}</p>
              <p className="text-app-muted text-[11px] mt-0.5 leading-tight">{desc}</p>
            </button>
          ))}
        </div>

        {error ? <p className="text-app-accent text-sm">{error}</p> : null}
        {note ? <p className="text-app-loot text-xs">{note}</p> : null}

        <div className="flex items-center gap-3">
          <button onClick={generate} disabled={loading || saving} className="btn-ghost disabled:opacity-50">
            {loading ? 'Génération…' : preview ? '↻ Régénérer' : 'Générer l\'aperçu'}
          </button>
          {preview ? (
            <button onClick={save} disabled={saving} className="btn-rush disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Utiliser cette image'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
