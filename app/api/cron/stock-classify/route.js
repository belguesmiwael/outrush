import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePackSuggestions, updatePackPerformance, classifyStock } from '@/lib/packs/engine';
import { rotateAndCompose } from '@/lib/packs/autocompose';

export const maxDuration = 60;

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  return Boolean(secret) && header === `Bearer ${secret}`;
}

/** Classification quotidienne hero / stable / dormant selon vélocité et âge. */
export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();

  // 1) Classification hero/stable/dormant (vélocité, ou proxy si catalogue jeune)
  const { classified: updated } = await classifyStock(admin);

  // 2) Boucle d'apprentissage : performance des packs récents → pondérations
  const perf = await updatePackPerformance(admin);
  // 3) Moteur de packs : top-3 suggestions par dormant
  const packs = await generatePackSuggestions(admin);
  // 4) LA CRIÉE — renouvellement quotidien : archive les lots auto de la veille
  //    et compose des lots frais avec noms IA (rotation = rareté "aujourd'hui").
  const lots = await rotateAndCompose(admin, { count: 4, composeImage: true });

  return NextResponse.json({
    ok: true,
    classified: updated,
    pack_performance_updated: perf.updated,
    pack_suggestions: packs.suggested,
    lots_composed: lots.created,
    lots_rotated: lots.archived,
  });
}
