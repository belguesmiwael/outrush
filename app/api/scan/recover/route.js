import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enrichScan } from '@/lib/scan/enrich';
import { enrichPhotoScan } from '@/lib/scan/enrich-photo';

export const maxDuration = 60;

/**
 * Relance les scans restés bloqués (enriching/queued). Déclenchable par
 * l'opérateur (bouton "réparer") ou par cron. Traite jusqu'à 5 scans/appel.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: stuck } = await admin
    .from('scan_events')
    .select('id, code_type, enrichment')
    .in('status', ['enriching', 'queued'])
    .lt('created_at', oneMinAgo)
    .order('created_at', { ascending: true })
    .limit(5);

  if (!stuck?.length) return NextResponse.json({ recovered: 0 });

  let recovered = 0;
  for (const scan of stuck) {
    try {
      if (scan.enrichment?.method === 'photo') await enrichPhotoScan(scan.id);
      else await enrichScan(scan.id);
      recovered++;
    } catch (err) {
      console.error('recover scan failed', { scanId: scan.id, message: err?.message });
      await admin.from('scan_events').update({ status: 'not_found' }).eq('id', scan.id);
    }
  }
  return NextResponse.json({ recovered });
}
