import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

/** Restitue le stock flash des réservations panier expirées (> 10 min). */
export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: expired } = await admin
    .from('flash_reservations')
    .select('id, item_id, qty')
    .eq('consumed', false)
    .lt('expires_at', new Date().toISOString())
    .limit(500);

  let released = 0;
  for (const r of expired ?? []) {
    const { error } = await admin.rpc('release_flash_stock', { p_item: r.item_id, p_qty: r.qty });
    if (!error) {
      await admin.from('flash_reservations').update({ consumed: true }).eq('id', r.id);
      released++;
    }
  }
  return NextResponse.json({ ok: true, released });
}
