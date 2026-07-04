'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

const StatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']),
});

/** Met à jour le statut d'une commande. */
export async function updateOrderStatus(formData) {
  const user = await requireStaff();
  const parsed = StatusSchema.safeParse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, status')
    .eq('id', parsed.data.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: 'not_found' };

  // Annulation → restitue le stock au ledger
  if (parsed.data.status === 'cancelled' && order.status !== 'cancelled') {
    const { data: items } = await admin
      .from('order_items')
      .select('product_id, qty')
      .eq('order_id', order.id);
    for (const it of items ?? []) {
      if (it.product_id) {
        await admin.from('inventory_movements').insert({
          product_id: it.product_id,
          delta: it.qty,
          reason: 'adjust',
          ref_id: order.id,
          actor_id: user.id,
        });
      }
    }
  }

  await admin
    .from('orders')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  revalidatePath('/admin/orders');
  return { ok: true };
}

const ShipSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().max(80).optional().or(z.literal('')),
  tracking: z.string().max(120).optional().or(z.literal('')),
});

/** Renseigne transporteur + n° de suivi et passe la commande en "expédiée". */
export async function setShipping(formData) {
  await requireStaff();
  const parsed = ShipSchema.safeParse({
    orderId: formData.get('orderId'),
    carrier: formData.get('carrier') ?? '',
    tracking: formData.get('tracking') ?? '',
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  await admin
    .from('orders')
    .update({
      carrier: parsed.data.carrier || null,
      tracking_number: parsed.data.tracking || null,
      status: 'shipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.orderId);

  revalidatePath('/admin/orders');
  return { ok: true };
}
