'use server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 min

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

/** Le PC crée une session de relais → renvoie le token à encoder dans le QR. */
export async function createScanSession() {
  const user = await requireStaff();
  const admin = createAdminClient();

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { data, error } = await admin
    .from('scan_sessions')
    .insert({ token, operator_id: user.id, expires_at: expiresAt })
    .select('id, token, expires_at')
    .single();
  if (error) return { ok: false, error: 'create_failed' };

  return { ok: true, token: data.token, expiresAt: data.expires_at };
}

const TokenSchema = z.object({ token: z.string().min(10).max(64) });

/**
 * Le téléphone rejoint la session (après authentification).
 * Vérifie : session existe, non expirée, ET appartient à l'utilisateur courant
 * (c'est le même opérateur qui scanne depuis son tel, connecté au même compte).
 */
export async function pairScanSession(rawToken) {
  const user = await requireStaff();
  const parsed = TokenSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, error: 'invalid_token' };

  const admin = createAdminClient();
  const { data: session } = await admin
    .from('scan_sessions')
    .select('id, operator_id, expires_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!session) return { ok: false, error: 'not_found' };
  if (new Date(session.expires_at) < new Date()) return { ok: false, error: 'expired' };
  if (session.operator_id !== user.id) return { ok: false, error: 'forbidden' };

  await admin
    .from('scan_sessions')
    .update({ paired_at: new Date().toISOString() })
    .eq('id', session.id);

  return { ok: true, sessionId: session.id };
}

/** Vérifie qu'une session est encore valide (garde de la page mobile). */
export async function validateScanSession(rawToken) {
  const user = await requireStaff();
  const parsed = TokenSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, error: 'invalid_token' };

  const admin = createAdminClient();
  const { data: session } = await admin
    .from('scan_sessions')
    .select('id, operator_id, expires_at')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (!session) return { ok: false, error: 'not_found' };
  if (new Date(session.expires_at) < new Date()) return { ok: false, error: 'expired' };
  if (session.operator_id !== user.id) return { ok: false, error: 'forbidden' };
  return { ok: true };
}
