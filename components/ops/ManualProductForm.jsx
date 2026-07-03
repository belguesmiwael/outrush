'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assistFromPhoto, createManualProduct } from '@/lib/actions/manual';

const inputCls =
  'w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/60 transition-shadow duration-120';

export default function ManualProductForm({ scan, assist, capturePath }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [assisting, startAssist] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [error, setError] = useState(null);

  const s = assist ?? {};

  function onAssist() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Prenez ou choisissez une photo du produit.');
      return;
    }
    const fd = new FormData();
    fd.set('scanId', scan.id);
    fd.set('photo', file);
    startAssist(async () => {
      const res = await assistFromPhoto(fd);
      if (!res.ok) setError(`Assistance impossible (${res.error}).`);
      else router.refresh(); // la suggestion arrive via le serveur
    });
  }

  function onPublish(formData) {
    setError(null);
    startPublish(async () => {
      const res = await createManualProduct(formData);
      if (!res.ok) {
        setError(
          res.error === 'gtin_exists'
            ? 'Ce code existe déjà en base — repassez par la file (doublon).'
            : `Publication impossible (${res.error}).`
        );
      } else {
        router.push('/ops/scan/queue');
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Étape 1 — photo + IA */}
      <section className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">
          1 · Photo du produit{' '}
          <span className="text-app-muted font-body font-normal text-sm">(l'IA enquête dessus)</span>
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="cursor-pointer rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-app-muted hover:border-[color:var(--app-accent)]/60 hover:text-app-text transition-colors duration-120">
            📷 Prendre / choisir une photo
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-24 rounded-lg object-cover" />
          ) : capturePath ? (
            <span className="text-xs text-app-success">✓ Photo déjà transmise</span>
          ) : null}
          <button
            type="button"
            onClick={onAssist}
            disabled={assisting}
            className="rounded-lg px-4 py-3 text-sm font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 hover:scale-[1.02] active:scale-95"
          >
            {assisting ? 'L’IA enquête…' : 'Analyser avec l’IA'}
          </button>
        </div>
        {assist ? (
          <p className="text-xs text-app-success">
            ✓ Suggestions injectées ci-dessous (confiance {Math.round((s.confidence ?? 0) * 100)}%)
            — corrigez librement.
          </p>
        ) : null}
      </section>

      {/* Étape 2 — fiche éditable */}
      <form action={onPublish} className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">2 · Fiche produit</h2>
        <input type="hidden" name="scanId" value={scan.id} />

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-app-muted">Titre (FR) *</span>
            <input name="titleFr" required maxLength={140} defaultValue={s.title?.fr ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Titre (EN) *</span>
            <input name="titleEn" required maxLength={140} defaultValue={s.title?.en ?? s.title?.fr ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Titre (AR) *</span>
            <input name="titleAr" dir="rtl" required maxLength={140} defaultValue={s.title?.ar ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Marque</span>
            <input name="brand" maxLength={80} defaultValue={s.brand ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">État du lot *</span>
            <select name="condition" defaultValue="new" className={inputCls}>
              <option value="new">Neuf</option>
              <option value="like_new">Comme neuf</option>
              <option value="box_damaged">Boîte abîmée</option>
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-app-muted">Description (FR)</span>
            <textarea name="descriptionFr" rows={3} maxLength={1200} defaultValue={s.description?.fr ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Prix marché constaté (USD)</span>
            <input name="marketPrice" type="number" step="0.01" min="0.01" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Prix outlet (USD) *</span>
            <input name="outletPrice" type="number" step="0.01" min="0.01" required className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Quantité *</span>
            <input name="quantity" type="number" min="1" max="10000" defaultValue={1} required className={inputCls} />
          </label>
        </div>

        {error ? <p className="text-sm text-app-accent">{error}</p> : null}

        <button
          disabled={publishing}
          className="w-full rounded-xl py-3 font-display font-bold text-lg bg-app-accent text-white disabled:opacity-50 transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]"
        >
          {publishing ? 'Publication…' : 'Publier le produit'}
        </button>
      </form>
    </div>
  );
}
