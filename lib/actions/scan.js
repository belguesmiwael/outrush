'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PublishSchema = z.object({
  scanId: z.string().uuid(),
  outletPrice: z.coerce.number().positive().max(100000),
  quantity: z.coerce.number().int().min(1).max(10000),
  condition: z.enum(['new', 'like_new', 'box_damaged']),
});

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) {
    throw new Error('forbidden');
  }
  return user;
}

/** Validation 1-tap : publie la fiche + mouvement de stock scan_in. */
export async function publishScannedProduct(formData) {
  const user = await requireStaff();
  const parsed = PublishSchema.safeParse({
    scanId: formData.get('scanId'),
    outletPrice: formData.get('outletPrice'),
    quantity: formData.get('quantity'),
    condition: formData.get('condition'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: scan } = await admin
    .from('scan_events')
    .select('id, status, product_id')
    .eq('id', parsed.data.scanId)
    .maybeSingle();
  if (!scan || scan.status !== 'ready' || !scan.product_id) {
    return { ok: false, error: 'not_ready' };
  }

  const { error: prodErr } = await admin
    .from('products')
    .update({
      outlet_price: parsed.data.outletPrice,
      condition: parsed.data.condition,
      status: 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', scan.product_id)
    .eq('status', 'draft');
  if (prodErr) return { ok: false, error: 'update_failed' };

  const { error: invErr } = await admin.from('inventory_movements').insert({
    product_id: scan.product_id,
    delta: parsed.data.quantity,
    reason: 'scan_in',
    ref_id: scan.id,
    actor_id: user.id,
  });
  if (invErr) return { ok: false, error: 'inventory_failed' };

  await admin.from('scan_events').update({ status: 'published' }).eq('id', scan.id);

  revalidatePath('/ops/scan/queue');
  revalidatePath('/');
  return { ok: true };
}

const IncrementSchema = z.object({
  scanId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10000),
});

/** Doublon GTIN : incrémente la quantité via le ledger. */
export async function incrementDuplicate(formData) {
  const user = await requireStaff();
  const parsed = IncrementSchema.safeParse({
    scanId: formData.get('scanId'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: scan } = await admin
    .from('scan_events')
    .select('id, status, product_id')
    .eq('id', parsed.data.scanId)
    .maybeSingle();
  if (!scan || scan.status !== 'duplicate' || !scan.product_id) {
    return { ok: false, error: 'not_duplicate' };
  }

  const { error } = await admin.from('inventory_movements').insert({
    product_id: scan.product_id,
    delta: parsed.data.quantity,
    reason: 'scan_in',
    ref_id: scan.id,
    actor_id: user.id,
  });
  if (error) return { ok: false, error: 'inventory_failed' };

  await admin.from('scan_events').update({ status: 'published' }).eq('id', scan.id);
  revalidatePath('/ops/scan/queue');
  return { ok: true };
}
