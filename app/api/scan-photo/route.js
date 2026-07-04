import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enrichPhotoScan } from '@/lib/scan/enrich-photo';

export const maxDuration = 60; // la recherche web IA peut prendre du temps

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

    // Code-barres optionnel joint à la photo (produit avec code → identif. plus sûre)
    const rawCode = String(form?.get('code') ?? '').trim();
    const barcode = /^\d{8,14}$/.test(rawCode) ? rawCode : null;

    const admin = createAdminClient();
    const buf = Buffer.from(await photo.arrayBuffer());
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';

    // scan_event : code réel si présent, sinon marqueur photo
    const { data: scan, error: scanErr } = await supabase
      .from('scan_events')
      .insert({
        code: barcode ?? `photo-${Date.now()}`,
        code_type: barcode ? (barcode.length === 12 ? 'upca' : 'ean13') : 'manual',
        operator_id: user.id,
      })
      .select('id')
      .single();
    if (scanErr) {
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    // Photo dans le bucket PRIVÉ (audit) — via le client USER (RLS staff),
    // pour ne pas dépendre de la clé service_role.
    const capturePath = `${scan.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('scan-captures')
      .upload(capturePath, buf, { contentType: photo.type, upsert: false });
    if (upErr) {
      console.error('scan-photo upload failed', { message: upErr.message });
      return NextResponse.json({ error: 'upload_failed', detail: upErr.message }, { status: 500 });
    }
    await supabase
      .from('scan_events')
      .update({ status: 'enriching', enrichment: { capture_path: capturePath, method: 'photo', barcode } })
      .eq('id', scan.id);

    // Enrichissement vision DANS la requête (pas de recherche web → rapide, tient
    // dans la limite Hobby). Renvoie le vrai statut final.
    let finalStatus = 'enriching';
    try {
      await enrichPhotoScan(scan.id);
      const { data: refreshed } = await admin
        .from('scan_events').select('status').eq('id', scan.id).single();
      finalStatus = refreshed?.status ?? 'ready';
    } catch (err) {
      console.error('enrichPhotoScan failed', { scanId: scan.id, message: err?.message });
    }
    return NextResponse.json({ id: scan.id, status: finalStatus }, { status: 200 });
  } catch (err) {
    console.error('scan-photo route error', { message: err?.message });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
