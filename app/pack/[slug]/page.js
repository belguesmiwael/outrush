import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized } from '@/lib/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function mediaUrl(path) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
    : null;
}

export default async function PackPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: pack } = await supabase
    .from('packs')
    .select(
      'id, slug, title, narrative, composed_img, pack_price, status, pack_items(qty, role, product:products(id, slug, title, brand, images, outlet_price, market_price, currency, quantity))'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!pack) notFound();

  const items = (pack.pack_items ?? []).filter((it) => it.product);
  const sumOutlet = items.reduce((s, it) => s + Number(it.product.outlet_price) * it.qty, 0);
  const saving = Math.max(0, sumOutlet - Number(pack.pack_price));
  const savingPct = sumOutlet > 0 ? Math.round((saving / sumOutlet) * 100) : 0;
  const inStock = items.every((it) => it.product.quantity >= it.qty);
  const img = mediaUrl(pack.composed_img);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Visuel composé */}
        <div className="rounded-2xl overflow-hidden bg-app-surface relative aspect-[3/2]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={localized(pack.title, 'fr')} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
              {items.slice(0, 4).map((it) => {
                const pImg = mediaUrl((it.product.images ?? [])[0]);
                return (
                  <div key={it.product.id} className="bg-app-surface-2 rounded-lg overflow-hidden">
                    {pImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pImg} alt="" className="w-full h-full object-contain" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <span className="absolute top-4 left-4 seal">PACK −{savingPct}%</span>
        </div>

        {/* Détail */}
        <div className="space-y-5">
          <h1 className="font-display font-extrabold text-3xl leading-tight">
            {localized(pack.title, 'fr')}
          </h1>
          {pack.narrative ? (
            <p className="text-app-muted leading-relaxed">{localized(pack.narrative, 'fr')}</p>
          ) : null}

          <div className="card-hunt p-5 space-y-2">
            <p className="text-sm text-app-muted line-through">
              Acheté séparément : {formatPrice(sumOutlet, 'USD')}
            </p>
            <p className="font-display font-extrabold text-4xl text-app-accent price-reveal">
              {formatPrice(pack.pack_price, 'USD')}
            </p>
            <p className="text-sm text-app-success">
              Économie : {formatPrice(saving, 'USD')} (−{savingPct}%)
            </p>
          </div>

          {inStock ? (
            <button className="w-full font-display font-bold text-lg rounded-xl py-4 bg-app-accent text-white transition-transform duration-[220ms] hover:scale-[1.01] active:scale-[0.98]">
              Ajouter le pack au panier
            </button>
          ) : (
            <p className="text-app-accent font-medium">Une pièce du pack vient de partir — pack indisponible.</p>
          )}
        </div>
      </div>

      {/* Composition */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-xl">Dans ce pack ({items.length})</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it) => {
            const p = it.product;
            const pImg = mediaUrl((p.images ?? [])[0]);
            return (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="card-hunt p-4 flex gap-4 items-center hover:ring-1 hover:ring-[color:var(--app-accent)]/40 transition-all duration-[220ms]"
              >
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-app-surface-2 shrink-0">
                  {pImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pImg} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  {p.brand ? (
                    <p className="text-xs uppercase tracking-widest text-app-muted">{p.brand}</p>
                  ) : null}
                  <p className="font-medium leading-snug line-clamp-2">{localized(p.title, 'fr')}</p>
                  <p className="text-sm mt-1">
                    {formatPrice(p.outlet_price, p.currency)}{' '}
                    <span className="text-xs text-app-muted">· ×{it.qty} · {it.role === 'hero' ? 'pièce vedette' : 'pièce rare'}</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
