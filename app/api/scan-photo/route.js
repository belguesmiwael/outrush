import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enrichPhotoScan } from '@/lib/scan/enrich-photo';

const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Rate-limit en mémoire par instance
const buckets = new Map();
const LIMIT = 20; // photos / minute / opérateur
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

    const form = await request.formData().catch(() => null);
    const photo = form?.get('photo');
    if (!photo || typeof photo === 'string' || photo.size === 0) {
      return NextResponse.json({ error: 'no_photo' }, { status: 400 });
    }
    if (photo.size > MAX_BYTES || !TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'bad_photo' }, { status: 400 });
    }

    const admin = createAdminClient();
    const buf = Buffer.from(await photo.arrayBuffer());
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';

    // scan_event via le client USER → RLS operator_id = auth.uid()
    const { data: scan, error: scanErr } = await supabase
      .from('scan_events')
      .insert({ code: `photo-${Date.now()}`, code_type: 'manual', operator_id: user.id })
      .select('id')
      .single();
    if (scanErr) {
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    // Photo dans le bucket PRIVÉ (audit) — chemin rangé dans l'enrichissement
    const capturePath = `${scan.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from('scan-captures')
      .upload(capturePath, buf, { contentType: photo.type, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
    await admin
      .from('scan_events')
      .update({ status: 'enriching', enrichment: { capture_path: capturePath, method: 'photo' } })
      .eq('id', scan.id);

    // Identification vision après la réponse — la rafale n'attend pas
    after(async () => {
      try {
        await enrichPhotoScan(scan.id);
      } catch (err) {
        console.error('enrichPhotoScan failed', { scanId: scan.id, message: err?.message });
      }
    });

    return NextResponse.json({ id: scan.id, status: 'enriching' }, { status: 202 });
  } catch (err) {
    console.error('scan-photo route error', { message: err?.message });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
