import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized } from '@/lib/i18n/dictionaries';
import ProductCard from '@/components/shop/ProductCard';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const locale = 'fr';
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, name, universe, parent_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!category) notFound();

  // Produits de cette catégorie ET de ses sous-catégories (même univers)
  const { data: sub } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', category.id);
  const catIds = [category.id, ...(sub ?? []).map((c) => c.id)];

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity, velocity_14d, views')
    .eq('status', 'published')
    .in('category_id', catIds)
    .order('created_at', { ascending: false })
    .limit(120);

  return (
    <main className="min-h-dvh">
      <SiteHeader locale={locale} />

      <section className="max-w-7xl mx-auto px-4 py-10">
        <nav className="text-sm text-app-muted mb-2">
          <Link href="/" className="hover:text-app-text">Accueil</Link> <span className="mx-1">/</span>{' '}
          <span className="text-app-text">{localized(category.name, locale)}</span>
        </nav>
        <h1 className="font-display font-bold text-3xl mb-8">{localized(category.name, locale)}</h1>

        {products?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} locale={locale} index={i} />
            ))}
          </div>
        ) : (
          <div className="card-hunt p-16 text-center space-y-2">
            <div className="font-display text-5xl text-app-accent opacity-40">∅</div>
            <p className="text-app-muted">Rien dans cette catégorie pour l'instant.</p>
            <Link href="/" className="inline-block text-app-accent text-sm">← Retour à l'accueil</Link>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
