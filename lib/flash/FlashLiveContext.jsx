'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const FlashLiveContext = createContext({ map: {}, ready: false });

export function useFlashLive() {
  return useContext(FlashLiveContext);
}

/**
 * Photo des prix flash actifs, tenue à jour en Realtime.
 * Le client Supabase (Realtime) est importé DYNAMIQUEMENT dans l'effet (après
 * l'hydratation) → il ne pèse plus sur le JS initial (meilleur FCP/LCP mobile).
 * L'état initial vient du serveur, donc rien ne clignote avant la souscription.
 */
export function FlashLiveProvider({ initial = {}, children }) {
  const [map, setMap] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('active_flash_products')
        .select('product_id, flash_price, remaining_qty, ends_at');
      const next = {};
      for (const row of data ?? []) {
        next[row.product_id] = {
          price: Number(row.flash_price),
          remaining: row.remaining_qty,
          endsAt: row.ends_at,
        };
      }
      setMap(next);
    } catch { /* garde l'état courant */ }
  }, []);

  useEffect(() => {
    let supabase = null;
    let channel = null;
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      if (cancelled) return;
      supabase = createClient();
      channel = supabase
        .channel('flash-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sale_items' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sales' }, refresh)
        .subscribe();
    })();
    const iv = setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      if (supabase && channel) supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [refresh]);

  return (
    <FlashLiveContext.Provider value={{ map }}>
      {children}
    </FlashLiveContext.Provider>
  );
}
