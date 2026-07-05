'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const FlashLiveContext = createContext({ map: {}, ready: false });

export function useFlashLive() {
  return useContext(FlashLiveContext);
}

/** Récupère la photo des prix flash actifs (via la vue) et la garde à jour en Realtime. */
export function FlashLiveProvider({ initial = {}, children }) {
  const [map, setMap] = useState(initial);

  const refresh = useCallback(async () => {
    try {
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
    const supabase = createClient();
    // Toute modif sur les items ou les ventes flash → on rafraîchit la map
    const channel = supabase
      .channel('flash-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sale_items' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sales' }, refresh)
      .subscribe();
    // Rafraîchit aussi à intervalle léger pour capter l'expiration temporelle (ends_at)
    const iv = setInterval(refresh, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [refresh]);

  return (
    <FlashLiveContext.Provider value={{ map }}>
      {children}
    </FlashLiveContext.Provider>
  );
}
