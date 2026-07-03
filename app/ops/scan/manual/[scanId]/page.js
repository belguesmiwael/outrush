import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ManualProductForm from '@/components/ops/ManualProductForm';

export const dynamic = 'force-dynamic';

export default async function ManualScanPage({ params }) {
  const { scanId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scanId)) notFound();

  const supabase = await createClient();
  const { data: scan } = await supabase
    .from('scan_events')
    .select('id, code, code_type, status, enrichment, created_at')
    .eq('id', scanId)
    .maybeSingle();
  if (!scan || scan.status !== 'not_found') notFound();

  const assist = scan.enrichment?.manual_assist ?? null;
  const capturePath = scan.enrichment?.capture_path ?? null;

  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl">Fiche manuelle assistée</h1>
        <p className="text-app-muted mt-1">
          Code <span className="font-mono text-app-text">{scan.code}</span> introuvable dans les
          bases GTIN. Photographiez le produit : l'IA remplit, vous validez.
        </p>
      </div>
      <ManualProductForm scan={scan} assist={assist} capturePath={capturePath} />
    </main>
  );
}
