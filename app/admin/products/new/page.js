import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('slug', { ascending: true });

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl">Nouveau produit</h1>
        <p className="text-app-muted mt-1">Saisie manuelle — pour le scan automatique, passez par /ops/scan.</p>
      </div>
      <ProductForm categories={categories ?? []} />
    </main>
  );
}
