'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const OrderSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(30),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
  note: z.string().max(300).optional().or(z.literal('')),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty: z.coerce.number().int().min(1).max(50),
  })).min(1).max(50),
});

/**
 * Commande à la livraison (COD). Le stock est décrémenté atomiquement en SQL
 * (place_cod_order), les prix sont relus côté serveur — jamais ceux du client.
 */
export async function placeCodOrder(payload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'auth_required' };

  const parsed = OrderSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'invalid', details: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const address = { line: d.address, city: d.city, country: d.country };

  // Devise d'affichage active : la commande est enregistrée dans CETTE devise
  // (montants convertis), pour que le bordereau de livraison soit dans la bonne monnaie.
  const { getCurrencySettings } = await import('@/lib/currency/server');
  const { currency, rate } = await getCurrencySettings();

  // Fonction SQL SECURITY DEFINER : vérifie le stock, crée la commande + items +
  // mouvements, le tout atomiquement. Le prix vient de la DB, pas du client.
  const { data: orderId, error } = await supabase.rpc('place_cod_order', {
    p_user: user.id,
    p_items: d.items,
    p_currency: currency,
    p_name: d.name,
    p_phone: d.phone,
    p_address: address,
    p_shipping: 0,
    p_fx_rate: rate,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('insufficient_stock')) return { ok: false, error: 'insufficient_stock' };
    if (msg.includes('product_unavailable')) return { ok: false, error: 'product_unavailable' };
    console.error('placeCodOrder failed', { message: msg });
    return { ok: false, error: 'order_failed' };
  }

  // Récupère le numéro de commande généré
  const { data: order } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', orderId)
    .maybeSingle();

  return { ok: true, orderId, orderNumber: order?.order_number ?? null };
}
