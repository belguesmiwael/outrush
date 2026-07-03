import { createClient } from '@/lib/supabase/server';
import { localized } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export default async function OpsFlashPage() {
  const supabase = await createClient();
  const { data: sales } = await supabase
    .from('flash_sales')
    .select('id, title, starts_at, ends_at, status, flash_sale_items(id, allocated_qty, remaining_qty)')
    .order('starts_at', { ascending: false })
    .limit(30);

  return (
    <main className="p-6 md:p-10 space-y-6">
      <h1 className="font-display font-bold text-3xl">Ventes Flash</h1>
      {(sales ?? []).length === 0 ? (
        <div className="card-hunt p-10 text-center text-app-muted">Aucun drop planifié. La création de drops arrive au Jalon 3 — tables prêtes.</div>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => {
            const sold = s.flash_sale_items?.reduce((a, i) => a + (i.allocated_qty - i.remaining_qty), 0) ?? 0;
            return (
              <div key={s.id} className="card-hunt px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{localized(s.title, 'fr')}</p>
                  <p className="text-xs text-app-muted mt-1">
                    {new Date(s.starts_at).toLocaleString('fr-FR')} → {new Date(s.ends_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="text-sm text-app-muted">{sold} vendus · {s.status}</div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
