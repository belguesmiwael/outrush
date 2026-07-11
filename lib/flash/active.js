import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

// Lecture PUBLIQUE des prix flash actifs, cachée 30 s (tag 'flash'). Le live
// exact est corrigé côté client par FlashLiveProvider (Realtime) — le cache ne
// sert qu'à accélérer le premier rendu (TTFB) sans requête DYNAMIQUE par requête.
const getFlashRows = unstable_cache(
  async () => {
    try {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from('active_flash_products')
        .select('product_id, flash_price, remaining_qty, ends_at, flash_sale_id');
      return data ?? [];
    } catch {
      return [];
    }
  },
  ['active-flash-rows'],
  { revalidate: 30, tags: ['flash'] }
);

/** Map product_id -> { flashPrice, remaining, endsAt, flashSaleId } (flash actif). */
export async function getActiveFlashMap() {
  const rows = await getFlashRows();
  const map = new Map();
  for (const row of rows) {
    map.set(row.product_id, {
      flashPrice: Number(row.flash_price),
      remaining: row.remaining_qty,
      endsAt: row.ends_at,
      flashSaleId: row.flash_sale_id,
    });
  }
  return map;
}

/** Applique le prix flash à un produit s'il est en flash actif. */
export function withFlash(product, flashMap) {
  const flash = flashMap.get(product.id);
  if (!flash) return { ...product, flash: null };
  return {
    ...product,
    flash: { price: flash.flashPrice, remaining: flash.remaining, endsAt: flash.endsAt },
    effective_price: flash.flashPrice,
  };
}
