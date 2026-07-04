import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client service_role — SERVEUR UNIQUEMENT (pipeline scan, webhooks, crons).
 * Ne jamais importer depuis un composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing on server');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing on Vercel env vars');
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
