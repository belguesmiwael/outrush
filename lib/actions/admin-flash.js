'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') throw new Error('forbidden');
}

const CreateSchema = z.object({
  title: z.string().min(2).max(120),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().uuid(),
    flashPrice: z.coerce.number().positive(),
    qty: z.coerce.number().int().positive(),
  })).min(1).max(50),
});

/** Crée un drop flash avec ses produits (prix flash + quantité allouée). */
export async function createFlashSale(payload) {
  await requireAdmin();
  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'invalid', detail: parsed.error.issues[0]?.message };

  const { title, startsAt, endsAt, items } = parsed.data;
  if (new Date(endsAt) <= new Date(startsAt)) return { ok: false, error: 'bad_dates', detail: 'La fin doit être après le début.' };

  const admin = createAdminClient();
  const status = new Date(startsAt) <= new Date() ? 'live' : 'scheduled';
  const { data: sale, error } = await admin
    .from('flash_sales')
    .insert({ title: { fr: title }, starts_at: startsAt, ends_at: endsAt, status })
    .select('id')
    .single();
  if (error || !sale) return { ok: false, error: 'create_failed', detail: error?.message };

  const rows = items.map((it) => ({
    flash_sale_id: sale.id,
    product_id: it.productId,
    flash_price: it.flashPrice,
    allocated_qty: it.qty,
    remaining_qty: it.qty,
  }));
  const { error: itemsErr } = await admin.from('flash_sale_items').insert(rows);
  if (itemsErr) {
    await admin.from('flash_sales').delete().eq('id', sale.id);
    return { ok: false, error: 'items_failed', detail: itemsErr.message };
  }

  revalidatePath('/admin/flash');
  revalidatePath('/');
  revalidatePath('/flash');
  return { ok: true, id: sale.id };
}

const IdSchema = z.object({ id: z.string().uuid() });

/** Change le statut d'un drop (live / paused / ended). */
export async function setFlashStatus(formData) {
  await requireAdmin();
  const id = formData.get('id');
  const status = formData.get('status');
  if (!IdSchema.safeParse({ id }).success) return { ok: false, error: 'invalid' };
  if (!['live', 'paused', 'ended', 'scheduled'].includes(status)) return { ok: false, error: 'bad_status' };

  const admin = createAdminClient();
  await admin.from('flash_sales').update({ status }).eq('id', id);
  revalidatePath('/admin/flash');
  revalidatePath('/');
  revalidatePath('/flash');
  return { ok: true };
}

/** Supprime un drop (et ses items via cascade). */
export async function deleteFlashSale(formData) {
  await requireAdmin();
  const id = formData.get('id');
  if (!IdSchema.safeParse({ id }).success) return { ok: false, error: 'invalid' };
  const admin = createAdminClient();
  await admin.from('flash_sale_items').delete().eq('flash_sale_id', id);
  await admin.from('flash_sales').delete().eq('id', id);
  revalidatePath('/admin/flash');
  revalidatePath('/');
  revalidatePath('/flash');
  return { ok: true };
}
