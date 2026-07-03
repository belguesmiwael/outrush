import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CURRENCIES = ['EUR', 'TND', 'GBP', 'AED', 'SAR', 'CAD', 'MAD'];

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${CURRENCIES.join(',')}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`fx upstream ${res.status}`);
    const json = await res.json();
    const admin = createAdminClient();
    const rows = Object.entries(json.rates ?? {})
      .filter(([, rate]) => Number.isFinite(rate) && rate > 0)
      .map(([currency, rate]) => ({ currency, rate, updated_at: new Date().toISOString() }));
    if (rows.length) {
      const { error } = await admin.from('fx_rates').upsert(rows);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, updated: rows.length });
  } catch (err) {
    console.error('fx cron failed', { message: err?.message });
    return NextResponse.json({ error: 'fx_failed' }, { status: 502 });
  }
}
