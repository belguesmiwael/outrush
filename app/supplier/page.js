import { createClient } from '@/lib/supabase/server';
import { localized } from '@/lib/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export default async function SupplierPage() {
  const supabase = await createClient();
  // RLS "supplier_read_own" garantit que seul son stock apparaît
  const { data: products } = await supabase
    .from('products')
    .select('id, title, brand, quantity, outlet_price, currency, status')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main className="p-6 md:p-10 space-y-6 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-3xl">
        Portail fournisseur <span className="text-app-accent">OUTRUSH</span>
      </h1>
      {(products ?? []).length === 0 ? (
        <div className="card-hunt p-10 text-center text-app-muted">
          Aucun lot déposé. Le dépôt CSV assisté arrive au Jalon 2.
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="card-hunt px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{p.brand ? `${p.brand} — ` : ''}{localized(p.title, 'fr')}</span>
              <span className="text-app-muted shrink-0">{p.quantity} u. · {p.status}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
