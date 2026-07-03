import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, slug, name').order('slug', { ascending: true }),
  ]);
  if (!product) notFound();

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl">Éditer le produit</h1>
        <p className="text-app-muted mt-1 font-mono text-sm">{product.slug}</p>
      </div>
      <ProductForm categories={categories ?? []} product={product} />
    </main>
  );
}
