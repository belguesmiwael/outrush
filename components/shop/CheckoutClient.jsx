'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart/CartContext';
import { placeCodOrder } from '@/lib/actions/orders';
import { formatPrice } from '@/lib/utils';
import { localized } from '@/lib/i18n/dictionaries';

const inputCls = 'w-full rounded-lg bg-app-surface-2 border border-white/8 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/60 transition-shadow duration-120';

export default function CheckoutClient() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', country: 'Tunisie', note: '' });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function submit() {
    setError(null);
    if (!items.length) { setError('Panier vide.'); return; }
    startTransition(async () => {
      const res = await placeCodOrder({
        ...form,
        items: items.map((i) => ({ product_id: i.id, qty: i.qty })),
      });
      if (!res.ok) {
        const msg = {
          auth_required: 'Connectez-vous pour commander.',
          insufficient_stock: 'Une pièce vient de partir — ajustez votre panier.',
          product_unavailable: 'Un produit n\'est plus disponible.',
          invalid: 'Vérifiez les champs du formulaire.',
        };
        setError(msg[res.error] ?? 'Commande impossible. Réessayez.');
        if (res.error === 'auth_required') setTimeout(() => router.push('/login'), 1200);
      } else {
        clear();
        setDone(res.orderNumber);
      }
    });
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-5">
        <div className="text-6xl">✓</div>
        <h1 className="font-display font-extrabold text-3xl">Commande confirmée</h1>
        <p className="text-app-muted">
          Votre commande <span className="text-app-accent font-mono font-bold">{done}</span> est enregistrée.
          Paiement à la livraison. Nous vous contacterons au {form.phone} pour la livraison.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/account" className="btn-ghost">Mes commandes</Link>
          <Link href="/" className="btn-rush">Continuer la chasse</Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-5xl opacity-30">🛒</div>
        <p className="text-app-muted">Votre panier est vide.</p>
        <Link href="/" className="btn-rush inline-flex">Retour à la boutique</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-[1.3fr_1fr] gap-8">
      {/* Formulaire */}
      <div className="space-y-6">
        <h1 className="font-display font-extrabold text-3xl">Livraison & paiement</h1>

        <div className="card-premium p-5 space-y-4">
          <h2 className="font-display font-bold">Coordonnées de livraison</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-app-muted">Nom complet *</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-app-muted">Téléphone *</span>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="+216 ..." />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-app-muted">Ville *</span>
              <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-app-muted">Adresse *</span>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="Rue, numéro, étage…" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-app-muted">Pays *</span>
              <input value={form.country} onChange={(e) => set('country', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-app-muted">Note (optionnel)</span>
              <input value={form.note} onChange={(e) => set('note', e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>

        <div className="card-premium p-5 space-y-3">
          <h2 className="font-display font-bold">Paiement</h2>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-app-accent/40 bg-[color:var(--app-accent)]/5 cursor-pointer">
            <input type="radio" checked readOnly className="accent-[color:var(--app-accent)]" />
            <div>
              <p className="font-medium">💵 Paiement à la livraison</p>
              <p className="text-xs text-app-muted">Payez en espèces à la réception de votre colis.</p>
            </div>
          </label>
          <div className="p-3 rounded-lg border border-white/8 text-app-muted text-sm flex items-center gap-3 opacity-60">
            <input type="radio" disabled />
            <span>💳 Carte bancaire — bientôt disponible</span>
          </div>
        </div>

        {error ? <p className="text-app-accent text-sm">{error}</p> : null}
      </div>

      {/* Récapitulatif */}
      <div className="space-y-4">
        <div className="card-premium p-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-display font-bold">Récapitulatif</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3 text-sm">
                <span className="text-app-muted min-w-0 truncate">{localized(it.title, 'fr')} ×{it.qty}</span>
                <span className="shrink-0">{formatPrice(it.outlet_price * it.qty, it.currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-app-muted">Sous-total</span><span>{formatPrice(subtotal, 'USD')}</span></div>
            <div className="flex justify-between"><span className="text-app-muted">Livraison</span><span className="text-app-success">À convenir</span></div>
            <div className="flex justify-between font-display font-extrabold text-lg pt-2">
              <span>Total</span><span className="text-app-accent">{formatPrice(subtotal, 'USD')}</span>
            </div>
          </div>
          <button onClick={submit} disabled={pending} className="btn-rush w-full">
            {pending ? 'Commande en cours…' : 'Confirmer la commande'}
          </button>
        </div>
      </div>
    </div>
  );
}
