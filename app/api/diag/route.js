import { NextResponse } from 'next/server';

/**
 * Diagnostic : révèle ce que le serveur Vercel voit réellement.
 * Ne divulgue AUCUNE valeur secrète — seulement présence + longueur + ref.
 * Accessible en GET pour test navigateur.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anthropic = process.env.ANTHROPIC_API_KEY ?? '';

  // Extrait le "ref" (projet) d'un JWT Supabase sans exposer la clé
  function jwtRef(token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.ref ?? null;
    } catch {
      return null;
    }
  }

  return NextResponse.json({
    marker: 'diag-v1-97297da',
    supabase_url: url,
    anon_present: anon.length > 0,
    anon_ref: jwtRef(anon),
    service_present: service.length > 0,
    service_ref: jwtRef(service),
    service_len: service.length,
    anthropic_present: anthropic.length > 0,
    anthropic_prefix: anthropic ? anthropic.slice(0, 7) : null,
  });
}
