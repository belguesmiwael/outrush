import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enrichScan } from '@/lib/scan/enrich';

export const maxDuration = 60;

const ScanSchema = z.object({
  code: z.string().regex(/^[\dA-Za-z\-_:./]{4,128}$/),
  code_type: z.enum(['ean13', 'upca', 'qr', 'manual']),
});

// Rate-limit en mémoire par instance (défense supplémentaire au niveau plateforme)
const buckets = new Map();
const LIMIT = 30; // scans / minute / opérateur
function rateLimited(userId) {
  const now = Date.now();
  const bucket = buckets.get(userId) ?? [];
  const fresh = bucket.filter((t) => now - t < 60_000);
  if (fresh.length >= LIMIT) return true;
  fresh.push(now);
  buckets.set(userId, fresh);
  if (buckets.size > 5000) buckets.clear();
  return false;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const role = user?.app_metadata?.role;
    if (!user || !['admin', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (rateLimited(user.id)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    // Insert via le client user → la policy RLS impose operator_id = auth.uid()
    const { data: scan, error } = await supabase
      .from('scan_events')
      .insert({
        code: parsed.data.code,
        code_type: parsed.data.code_type,
        operator_id: user.id,
      })
      .select('id, status')
      .single();

    if (error) {
      console.error('scan insert failed', { message: error.message });
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    // Enrichissement DANS la requête (after() n'est pas fiable en serverless)
    let finalStatus = 'enriching';
    try {
      await enrichScan(scan.id);
      const { data: refreshed } = await supabase
        .from('scan_events')
        .select('status')
        .eq('id', scan.id)
        .single();
      finalStatus = refreshed?.status ?? 'ready';
    } catch (err) {
      console.error('enrichScan failed', { scanId: scan.id, message: err?.message });
      finalStatus = 'not_found';
    }

    return NextResponse.json({ id: scan.id, status: finalStatus }, { status: 200 });
  } catch (err) {
    console.error('scan route error', { message: err?.message });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
