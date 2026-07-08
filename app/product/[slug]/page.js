import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import LotReveal from '@/components/shop/LotReveal';
import LotNumber from '@/components/shop/LotNumber';
import { Eye, Check } from 'lucide-react';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import AddToCartButton from '@/components/shop/AddToCartButton';
import LiveViewers from '@/components/shop/LiveViewers';
import LiveStock from '@/components/shop/LiveStock';
import LiveCartPressure from '@/components/shop/LiveCartPressure';
import Countdown from '@/components/shop/Countdown';
import FlashBadge from '@/components/shop/FlashBadge';
import Money from '@/components/shop/Money';
import ProductGallery from '@/components/shop/ProductGallery';

export const revalidate = 120;

export default async function ProductPage({ params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();

  const locale = 'fr';
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*, reviews(rating, body, created_at)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!product) notFound();

  // Prix flash actif de ce produit (si en vente flash)
  const { data: flashRow } = await supabase
    .from('active_flash_products')
    .select('flash_price, remaining_qty, ends_at')
    .eq('product_id', product.id)
    .maybeSingle();
  const flash = flashRow ? { price: Number(flashRow.flash_price), remaining: flashRow.remaining_qty, endsAt: flashRow.ends_at } : null;
  if (flash) product.flash = flash;

  // Incrément de vue réel (fire-and-forget) + ventes réelles 24h
  supabase.rpc('bump_product_views', { p_id: product.id }).then(() => {});
  const { data: sales24 } = await supabase.rpc('sales_last_24h');
  const soldToday = (sales24 ?? []).find((r) => r.product_id === product.id)?.sold ?? 0;
  const { data: pressure } = await supabase
    .from('cart_pressure').select('in_carts').eq('product_id', product.id).maybeSingle();
  const inCarts = pressure?.in_carts ?? 0;

  const images = Array.isArray(product.images) ? product.images : [];
  const mainImg = images[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${images[0]}`
    : null;
  const sources = Array.isArray(product.market_sources) ? product.market_sources : [];

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="min-h-dvh max-w-6xl mx-auto px-4 py-6 md:py-8 safe-x">
        <Link href="/" className="text-sm text-app-muted hover:text-app-text transition-colors duration-120">
          ← OUTRUSH
        </Link>
      <div className="grid md:grid-cols-2 gap-6 md:gap-10 mt-4 md:mt-6">
        <div className="relative">
          <div className="spotlight-sweep rounded-[22px]" aria-hidden="true" />
          <ProductGallery images={images} alt={localized(product.title, locale)} />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2.5 flex-wrap">
            <LotNumber product={product} />
            {product.brand ? (
              <span className="text-xs uppercase tracking-widest text-app-muted">{product.brand}</span>
            ) : null}
          </div>
          <h1 className="font-display font-bold text-3xl leading-tight">{localized(product.title, locale)}</h1>
          {flash ? (
            <div className="flex items-center gap-3 flex-wrap">
              <FlashBadge force />
              <span className="eyebrow eyebrow-hot">Clôture de la vacation</span>
              <Countdown endsAt={flash.endsAt} serverNow={new Date().toISOString()} className="chrono-vacation text-lg" />
            </div>
          ) : null}

          {/* Révélation du lot : le prix appelé en escalade */}
          <LotReveal
            productId={product.id}
            marketPrice={product.market_price}
            outletPrice={product.outlet_price}
            flashPrice={flash ? flash.price : null}
            currency={product.currency}
          />

          <div className="card-hunt p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-app-success" />
              <p className="text-xs uppercase tracking-widest text-app-success font-semibold">Meilleur prix constaté</p>
            </div>
            <p className="text-sm text-app-text leading-relaxed">
              Nous scannons le marché pour trouver le prix le plus bas disponible
              {sources.length && sources[0]?.price ? (
                <> — constaté à <span className="num"><Money amount={sources[0].price} /></span>
                {sources[0].seen_at ? <> le {new Date(sources[0].seen_at).toLocaleDateString('fr-FR')}</> : null}</>
              ) : null}. Notre prix OUTRUSH passe encore en dessous.
            </p>
            <p className="text-sm text-app-muted leading-relaxed">
              Ce prix très réduit vient de notre déstockage de produits neufs, jamais d'un défaut :
              tous nos articles sont <span className="text-app-text font-medium">neufs, intacts et parfaitement valables</span>.
              Vous payez moins simplement parce que nous écoulons des invendus et fins de série.
            </p>
          </div>

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

          {/* Points forts */}
          {product.specs?._highlights?.[locale]?.length ? (
            <ul className="space-y-1.5">
              {product.specs._highlights[locale].map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check size={14} strokeWidth={2.5} className="text-app-loot mt-0.5 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Caractéristiques */}
          {product.specs && Object.keys(product.specs).filter((k) => k !== '_highlights').length ? (
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <p className="px-4 py-2.5 text-xs uppercase tracking-widest text-app-muted bg-white/[0.03]">Caractéristiques</p>
              <dl className="divide-y divide-white/5">
                {Object.entries(product.specs)
                  .filter(([k]) => k !== '_highlights')
                  .slice(0, 10)
                  .map(([k, v]) => (
                    <div key={k} className="px-4 py-2 flex justify-between gap-4 text-sm">
                      <dt className="text-app-muted capitalize">{k}</dt>
                      <dd className="text-right">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          ) : null}

          {/* Signaux de conversion — données réelles + stock live */}
          <div className="flex flex-wrap gap-2 text-xs items-center">
            <LiveStock productId={product.id} initial={product.quantity} />
            {product.views > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-white/5 text-app-muted inline-flex items-center gap-1.5"><Eye size={12} strokeWidth={2} /> <span className="num">{product.views}</span> vues</span>
            ) : null}
            <LiveViewers productId={product.id} />
          </div>
          <LiveCartPressure productId={product.id} initialInCarts={inCarts} initialSold={soldToday} />

          <AddToCartButton product={product} className="md:w-auto md:px-12" />

          {product.reviews?.length ? (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h2 className="font-display font-bold">Avis vérifiés</h2>
              {product.reviews.slice(0, 5).map((r, i) => (
                <div key={i} className="text-sm">
                  <span className="text-app-accent">{'★'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(r.rating) || 0)))}</span>
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
