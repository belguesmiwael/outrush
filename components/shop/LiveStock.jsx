'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Affiche le stock d'un produit et le fait BAISSER en temps réel quand
 * quelqu'un achète (via Realtime sur la table products). Données 100% réelles.
 * Quand le stock chute, un flash d'urgence "quelqu'un vient d'en prendre" apparaît.
 */
export default function LiveStock({ productId, initial }) {
  const [qty, setQty] = useState(initial);
  const [justDropped, setJustDropped] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`stock:${productId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${productId}` },
        (payload) => {
          const next = payload.new?.quantity;
          if (typeof next === 'number') {
            setQty((prev) => {
              if (next < prev) {
                setJustDropped(true);
                setTimeout(() => setJustDropped(false), 3500);
              }
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [productId]);

  if (qty <= 0) {
    return <span className="px-2.5 py-1 rounded-full bg-white/5 text-app-muted text-xs">Épuisé</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${qty <= 5 ? 'bg-[color:var(--app-accent)]/15 text-app-accent pulse-last' : 'bg-white/5 text-app-muted'}`}>
        {qty <= 5 ? `⚡ Plus que ${qty}` : `En stock : ${qty}`}
      </span>
      {justDropped ? (
        <span className="px-2.5 py-1 rounded-full bg-app-accent text-white text-xs font-medium animate-[reveal-up_0.4s_ease]">
          🔥 Quelqu'un vient d'en prendre
        </span>
      ) : null}
    </span>
  );
}
