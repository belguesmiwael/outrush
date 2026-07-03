'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/lib/actions/admin-products';

const inputCls =
  'w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/60 transition-shadow duration-120';

function mediaUrl(path) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`;
}

export default function ProductForm({ categories = [], product = null }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [keptImages, setKeptImages] = useState(
    Array.isArray(product?.images) ? product.images : []
  );

  const title = product?.title ?? {};
  const desc = product?.description ?? {};

  function onFiles(e) {
    const files = [...e.target.files];
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function onSubmit(formData) {
    setError(null);
    keptImages.forEach((p) => formData.append('keepImage', p));
    startTransition(async () => {
      const res = isEdit ? await updateProduct(formData) : await createProduct(formData);
      if (!res.ok) {
        setError(`Échec (${res.error}).`);
      } else {
        router.push('/admin/products');
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {isEdit ? <input type="hidden" name="productId" value={product.id} /> : null}

      {/* Titres */}
      <section className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">Identité</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Titre FR *</span>
            <input name="titleFr" required maxLength={140} defaultValue={title.fr ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Titre EN *</span>
            <input name="titleEn" required maxLength={140} defaultValue={title.en ?? title.fr ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Titre AR *</span>
            <input name="titleAr" dir="rtl" required maxLength={140} defaultValue={title.ar ?? ''} className={inputCls} />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Marque</span>
            <input name="brand" maxLength={80} defaultValue={product?.brand ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Catégorie</span>
            <select name="categoryId" defaultValue={product?.category_id ?? ''} className={inputCls}>
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name?.fr ?? c.slug}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Descriptions */}
      <section className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">Descriptions</h2>
        <label className="space-y-1 text-sm block">
          <span className="text-app-muted">FR</span>
          <textarea name="descriptionFr" rows={2} maxLength={1500} defaultValue={desc.fr ?? ''} className={inputCls} />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">EN</span>
            <textarea name="descriptionEn" rows={2} maxLength={1500} defaultValue={desc.en ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">AR</span>
            <textarea name="descriptionAr" dir="rtl" rows={2} maxLength={1500} defaultValue={desc.ar ?? ''} className={inputCls} />
          </label>
        </div>
      </section>

      {/* Prix & stock */}
      <section className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">Prix & stock</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Prix marché</span>
            <input name="marketPrice" type="number" step="0.01" min="0.01" defaultValue={product?.market_price ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Prix outlet *</span>
            <input name="outletPrice" type="number" step="0.01" min="0.01" required defaultValue={product?.outlet_price ?? ''} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Devise</span>
            <select name="currency" defaultValue={product?.currency ?? 'USD'} className={inputCls}>
              <option>USD</option><option>EUR</option><option>TND</option><option>GBP</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Quantité</span>
            <input name="quantity" type="number" min="0" max="100000" defaultValue={product?.quantity ?? 0} className={inputCls} />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">État</span>
            <select name="condition" defaultValue={product?.condition ?? 'new'} className={inputCls}>
              <option value="new">Neuf</option>
              <option value="like_new">Comme neuf</option>
              <option value="box_damaged">Boîte abîmée</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-app-muted">Provenance</span>
            <input name="provenance" maxLength={160} defaultValue={product?.provenance ?? ''} className={inputCls} />
          </label>
        </div>
      </section>

      {/* Images */}
      <section className="card-hunt p-5 space-y-4">
        <h2 className="font-display font-bold text-lg">Images</h2>
        {keptImages.length ? (
          <div className="flex flex-wrap gap-3">
            {keptImages.map((path) => (
              <div key={path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(path)} alt="" className="h-20 w-20 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setKeptImages((imgs) => imgs.filter((p) => p !== path))}
                  className="absolute -top-2 -right-2 bg-app-accent text-white rounded-full w-5 h-5 text-xs leading-none"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 px-4 py-6 text-center text-sm text-app-muted hover:border-[color:var(--app-accent)]/60 hover:text-app-text transition-colors duration-120">
          🖼️ Ajouter des images (JPEG / PNG / WebP, 6 MB max)
          <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
        </label>
        {previews.length ? (
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-20 w-20 object-cover rounded-lg ring-1 ring-[color:var(--app-accent)]/40" />
            ))}
          </div>
        ) : null}
      </section>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="publish" defaultChecked={!product || product.status === 'published'} className="accent-[color:var(--app-accent)] w-4 h-4" />
        Publier dans la boutique (sinon brouillon)
      </label>

      {error ? <p className="text-sm text-app-accent">{error}</p> : null}

      <div className="flex gap-3">
        <button
          disabled={pending}
          className="flex-1 rounded-xl py-3 font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]"
        >
          {pending ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="rounded-xl px-5 py-3 text-app-muted hover:text-app-text transition-colors duration-120"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
