import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import PriceReveal from '@/components/shop/PriceReveal';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import { formatPrice } from '@/lib/utils';

export const revalidate = 120;

export default async function ProductPage({ params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();

  const locale = 'fr';
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*, reviews(rating, body, created_at)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!product) notFound();

  const images = Array.isArray(product.images) ? product.images : [];
  const mainImg = images[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${images[0]}`
    : null;
  const sources = Array.isArray(product.market_sources) ? product.market_sources : [];

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="min-h-dvh max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-app-muted hover:text-app-text transition-colors duration-120">
          ← OUTRUSH
        </Link>
      <div className="grid md:grid-cols-2 gap-10 mt-6">
        <div className="card-hunt overflow-hidden aspect-[4/5] bg-app-surface-2">
          {mainImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImg} alt={localized(product.title, locale)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-app-muted font-display text-6xl">O</div>
          )}
        </div>

        <div className="space-y-6">
          {product.brand ? (
            <p className="text-xs uppercase tracking-widest text-app-muted">{product.brand}</p>
          ) : null}
          <h1 className="font-display font-bold text-3xl leading-tight">{localized(product.title, locale)}</h1>
          <PriceReveal
            marketPrice={product.market_price}
            outletPrice={product.outlet_price}
            currency={product.currency}
            locale={locale}
            size="lg"
          />

          {sources.length ? (
            <div className="card-hunt p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-app-muted">Prix vérifié — sources</p>
              {sources.slice(0, 4).map((s, i) => (
                <p key={i} className="text-sm text-app-muted">
                  {s.source} · {formatPrice(s.price, product.currency, locale)} —{' '}
                  {t(locale, 'verified_price')} {s.seen_at ? new Date(s.seen_at).toLocaleDateString('fr-FR') : '—'}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex gap-3 text-sm text-app-muted">
            <span className="px-3 py-1 rounded-full bg-app-surface-2 border border-white/5">
              État : {product.condition === 'new' ? 'Neuf' : product.condition === 'like_new' ? 'Comme neuf' : 'Boîte abîmée'}
            </span>
            {product.provenance ? (
              <span className="px-3 py-1 rounded-full bg-app-surface-2 border border-white/5">
                Provenance : {product.provenance}
              </span>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-app-muted leading-relaxed">{localized(product.description, locale)}</p>
          ) : null}

          <button
            className="w-full md:w-auto px-10 font-display font-bold py-3.5 rounded-lg bg-app-accent text-white transition-transform duration-120 ease-out-expo active:scale-[0.97] disabled:opacity-50"
            disabled={product.quantity <= 0}
          >
            {product.quantity > 0 ? t(locale, 'add_to_cart') : 'Épuisé'}
          </button>

          {product.reviews?.length ? (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h2 className="font-display font-bold">Avis vérifiés</h2>
              {product.reviews.slice(0, 5).map((r, i) => (
                <div key={i} className="text-sm">
                  <span className="text-app-accent">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  {r.body ? <p className="text-app-muted mt-1">{r.body}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
