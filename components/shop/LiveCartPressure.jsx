'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Affiche en temps réel la pression panier ("X au panier") et les ventes 24h.
 * Signaux 100% réels : lit cart_pressure (réservations non expirées) et écoute
 * les mouvements de stock pour incrémenter les ventes en direct.
 */
export default function LiveCartPressure({ productId, initialInCarts = 0, initialSold = 0 }) {
  const [inCarts, setInCarts] = useState(initialInCarts);
  const [sold, setSold] = useState(initialSold);

  useEffect(() => {
    const supabase = createClient();

    async function refreshCarts() {
      try {
        const { data } = await supabase
          .from('cart_pressure')
          .select('in_carts')
          .eq('product_id', productId)
          .maybeSingle();
        setInCarts(data?.in_carts ?? 0);
      } catch { /* garde l'état */ }
    }
    refreshCarts();

    const channel = supabase
      .channel(`pressure:${productId}`)
      // Toute modif de réservation sur ce produit → recompte
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cart_reservations', filter: `product_id=eq.${productId}` },
        refreshCarts)
      // Vente (mouvement de stock négatif) → incrémente les vendus en direct
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_movements', filter: `product_id=eq.${productId}` },
        (payload) => {
          const d = payload.new?.delta ?? 0;
          if (d < 0 && payload.new?.reason === 'sale') setSold((s) => s + Math.abs(d));
        })
      .subscribe();

    // Rafraîchit à intervalle léger pour capter les expirations de réservation
    const iv = setInterval(refreshCarts, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [productId]);

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      {inCarts > 0 ? (
        <span className="px-2.5 py-1 rounded-full bg-[color:var(--app-accent)]/12 text-app-accent">
          🛒 <span className="num">{inCarts}</span> au panier maintenant
        </span>
      ) : null}
      {sold > 0 ? (
        <span className="px-2.5 py-1 rounded-full bg-white/5 text-app-muted">
          ✓ <span className="num">{sold}</span> vendu{sold > 1 ? 's' : ''} · 24h
        </span>
      ) : null}
    </div>
  );
}
