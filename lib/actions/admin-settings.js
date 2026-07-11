'use server';
import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') throw new Error('forbidden');
}

const Schema = z.object({
  currency: z.enum(['USD', 'EUR', 'TND']),
  rate_eur: z.coerce.number().positive().max(100),
  rate_tnd: z.coerce.number().positive().max(100),
});

export async function updateCurrencySettings(formData) {
  await requireAdmin();
  const parsed = Schema.safeParse({
    currency: formData.get('currency'),
    rate_eur: formData.get('rate_eur'),
    rate_tnd: formData.get('rate_tnd'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const rates = { USD: 1, EUR: parsed.data.rate_eur, TND: parsed.data.rate_tnd };
  await admin.from('app_settings').upsert([
    { key: 'display_currency', value: parsed.data.currency, updated_at: new Date().toISOString() },
    { key: 'fx_rates', value: rates, updated_at: new Date().toISOString() },
  ]);

  revalidateTag('currency');
  revalidatePath('/', 'layout');
  return { ok: true };
}
