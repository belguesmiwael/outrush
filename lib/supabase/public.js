import { createClient as createSbClient } from '@supabase/supabase-js';

/**
 * Client Supabase SANS cookies (anon), pour les lectures 100% PUBLIQUES
 * (devise, flash actif, catalogue publié). Ne lit aucun cookie/header → NE FORCE
 * PAS le rendu dynamique, donc ces données peuvent être mises en cache (ISR) et
 * le TTFB s'effondre sur mobile. RLS reste actif au niveau anon.
 */
export function createPublicClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
