import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client service_role — SERVEUR UNIQUEMENT (pipeline scan, webhooks, crons).
 * Ne jamais importer depuis un composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env vars missing');
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
