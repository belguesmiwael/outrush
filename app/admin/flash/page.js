import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { localized } from '@/lib/i18n/dictionaries';
import FlashCreator from '@/components/admin/FlashCreator';
import { setFlashStatus, deleteFlashSale } from '@/lib/actions/admin-flash';
import Money from '@/components/shop/Money';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = {
  live: 'En cours', scheduled: 'Planifié', paused: 'En pause', ended: 'Terminé',
};

export default async function AdminFlashPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: products }, { data: sales }] = await Promise.all([
    admin.from('products')
      .select('id, slug, title, outlet_price, quantity')
      .eq('status', 'published')
      .gt('quantity', 0)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('flash_sales')
      .select('id, title, starts_at, ends_at, status, flash_sale_items(id, flash_price, allocated_qty, remaining_qty)')
      .order('starts_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="eyebrow eyebrow-hot">Administration · drops</p>
        <h1 className="font-display font-bold text-3xl mt-1">Ventes Flash</h1>
        <p className="text-app-muted mt-2">Crée des drops chronométrés : sélectionne des produits, fixe un prix flash et une quantité limitée.</p>
      </div>

      <FlashCreator products={products ?? []} />

      <section className="space-y-3">
        <p className="eyebrow">Drops ({(sales ?? []).length})</p>
        {(sales ?? []).length === 0 ? (
          <div className="card-hunt p-10 text-center text-app-muted">Aucun drop pour le moment. Crée le premier ci-dessus.</div>
        ) : (
          sales.map((s) => {
            const items = s.flash_sale_items ?? [];
            const allocated = items.reduce((a, i) => a + i.allocated_qty, 0);
            const remaining = items.reduce((a, i) => a + i.remaining_qty, 0);
            const sold = allocated - remaining;
            return (
              <div key={s.id} className="card-premium p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.status === 'live' ? 'bg-app-accent pulse-last' : s.status === 'scheduled' ? 'bg-app-loot' : 'bg-white/30'}`} />
                      <p className="font-display font-bold">{localized(s.title, 'fr')}</p>
                      <span className="eyebrow">{STATUS_LABEL[s.status] ?? s.status}</span>
                    </div>
                    <p className="text-xs text-app-muted mt-1 num">
                      {new Date(s.starts_at).toLocaleString('fr-FR')} → {new Date(s.ends_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="num-loot">{sold}<span className="text-app-muted">/{allocated}</span> vendus</p>
                    <p className="text-app-muted text-xs num">{items.length} produit(s)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {s.status !== 'live' ? (
                    <form action={setFlashStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="live" />
                      <button className="text-xs px-3 py-1.5 rounded-lg text-app-accent border border-[color:var(--app-accent)]/30 hover:bg-[color:var(--app-accent)]/10 transition-colors duration-120">▶ Activer</button>
                    </form>
                  ) : (
                    <form action={setFlashStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="paused" />
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-app-surface transition-colors duration-120">⏸ Pause</button>
                    </form>
                  )}
                  <form action={setFlashStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="ended" />
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-app-surface transition-colors duration-120">■ Terminer</button>
                  </form>
                  <form action={deleteFlashSale} className="ml-auto">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs px-3 py-1.5 rounded-lg text-app-muted hover:text-app-accent transition-colors duration-120">Supprimer</button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
