import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  return Boolean(secret) && header === `Bearer ${secret}`;
}

/** Classification quotidienne hero / stable / dormant selon vélocité et âge. */
export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();

  const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: products }, { data: sales }] = await Promise.all([
    admin.from('products').select('id, created_at, quantity').eq('status', 'published').limit(5000),
    admin
      .from('inventory_movements')
      .select('product_id, delta, created_at')
      .in('reason', ['sale', 'flash_claim'])
      .gte('created_at', since30)
      .limit(50000),
  ]);

  const soldBy = new Map();
  (sales ?? []).forEach((m) => {
    const rec = soldBy.get(m.product_id) ?? { d14: 0, d30: 0 };
    const units = Math.abs(m.delta);
    rec.d30 += units;
    if (m.created_at >= since14) rec.d14 += units;
    soldBy.set(m.product_id, rec);
  });

  let updated = 0;
  for (const p of products ?? []) {
    const rec = soldBy.get(p.id) ?? { d14: 0, d30: 0 };
    const v14 = Math.round((rec.d14 / 14) * 1000) / 1000;
    const v30 = Math.round((rec.d30 / 30) * 1000) / 1000;
    const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400_000;

    let cls = 'new';
    if (ageDays > 7) {
      if (v14 >= 0.5) cls = 'hero';
      else if (v30 >= 0.1) cls = 'stable';
      else cls = 'dormant';
    }

    const { error } = await admin
      .from('products')
      .update({ velocity_14d: v14, velocity_30d: v30, stock_class: cls })
      .eq('id', p.id);
    if (!error) updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
