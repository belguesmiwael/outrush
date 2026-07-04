import { NextResponse } from 'next/server';

/**
 * ANCIENNE route "code-barres seul" — DÉSACTIVÉE.
 * Tout scan doit désormais passer par /api/scan-photo (code + photo ensemble),
 * pour une identification fiable par vision. Cette route ne crée plus de fiches
 * "introuvables" silencieuses.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'deprecated', message: 'Utilisez le flux code+photo (/api/scan-photo).' },
    { status: 410 }
  );
}
