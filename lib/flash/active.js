import { createClient } from '@/lib/supabase/server';

/**
 * Retourne une Map product_id -> { flashPrice, remaining, endsAt, flashSaleId }
 * pour tous les produits actuellement en vente flash active.
 * Utilisé pour appliquer le prix flash et le badge partout dans l'app.
 */
export async function getActiveFlashMap() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('active_flash_products')
      .select('product_id, flash_price, remaining_qty, ends_at, flash_sale_id');
    const map = new Map();
    for (const row of data ?? []) {
      map.set(row.product_id, {
        flashPrice: Number(row.flash_price),
        remaining: row.remaining_qty,
        endsAt: row.ends_at,
        flashSaleId: row.flash_sale_id,
      });
    }
    return map;
  } catch {
    return new Map();
  }
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
