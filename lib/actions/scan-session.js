'use server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 min

async function requireStaffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return { supabase, user };
}

/** Le PC crée une session de relais → renvoie le token à encoder dans le QR. */
export async function createScanSession() {
  let ctx;
  try {
    ctx = await requireStaffClient();
  } catch {
    return { ok: false, error: 'forbidden' };
  }
  const { supabase, user } = ctx;

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  // Insert via le client USER → la policy RLS impose operator_id = auth.uid()
  const { data, error } = await supabase
    .from('scan_sessions')
    .insert({ token, operator_id: user.id, expires_at: expiresAt })
    .select('id, token, expires_at')
    .single();
  if (error) {
    console.error('createScanSession failed', { message: error.message });
    return { ok: false, error: 'create_failed' };
  }

  return { ok: true, token: data.token, expiresAt: data.expires_at };
}

const TokenSchema = z.object({ token: z.string().min(10).max(64) });

/**
 * Le téléphone rejoint la session (après authentification).
 * Vérifie : session existe, non expirée, ET appartient à l'utilisateur courant
 * (c'est le même opérateur qui scanne depuis son tel, connecté au même compte).
 */
export async function pairScanSession(rawToken) {
  let ctx;
  try {
    ctx = await requireStaffClient();
  } catch {
    return { ok: false, error: 'forbidden' };
  }
  const { supabase, user } = ctx;
  const parsed = TokenSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, error: 'invalid_token' };

  const { data: session } = await supabase
    .from('scan_sessions')
    .select('id, operator_id, expires_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!session) return { ok: false, error: 'not_found' };
  if (new Date(session.expires_at) < new Date()) return { ok: false, error: 'expired' };
  if (session.operator_id !== user.id) return { ok: false, error: 'forbidden' };

  await supabase
    .from('scan_sessions')
    .update({ paired_at: new Date().toISOString() })
    .eq('id', session.id);

  return { ok: true, sessionId: session.id };
}

/** Vérifie qu'une session est encore valide (garde de la page mobile). */
export async function validateScanSession(rawToken) {
  let ctx;
  try {
    ctx = await requireStaffClient();
  } catch {
    return { ok: false, error: 'forbidden' };
  }
  const { supabase, user } = ctx;
  const parsed = TokenSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, error: 'invalid_token' };

  const { data: session } = await supabase
    .from('scan_sessions')
    .select('id, operator_id, expires_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!session) return { ok: false, error: 'not_found' };
  if (new Date(session.expires_at) < new Date()) return { ok: false, error: 'expired' };
  if (session.operator_id !== user.id) return { ok: false, error: 'forbidden' };
  return { ok: true };
}
