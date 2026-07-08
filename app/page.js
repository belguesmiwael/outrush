import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { localized, t } from '@/lib/i18n/dictionaries';
import { discountPct } from '@/lib/utils';
import Money from '@/components/shop/Money';
import { pickDailyRush, secondsUntilRotation } from '@/lib/rush/daily';
import Countdown from '@/components/shop/Countdown';
import FlashCard from '@/components/shop/FlashCard';
import RotationTimer from '@/components/shop/RotationTimer';
import ProductCard from '@/components/shop/ProductCard';
import { getActiveFlashMap, withFlash } from '@/lib/flash/active';
import SiteHeader from '@/components/shop/SiteHeader';
import SiteFooter from '@/components/shop/SiteFooter';
import Hero from '@/components/shop/Hero';
import CategoryGrid from '@/components/shop/CategoryGrid';
import EditorialVitrine from '@/components/shop/EditorialVitrine';
import SalleEnDirect from '@/components/shop/SalleEnDirect';
import AdjudicationsTicker from '@/components/shop/AdjudicationsTicker';
import { Gavel, ShieldCheck, Package, Sparkles, ArrowRight, Hammer } from 'lucide-react';

export const revalidate = 60;

export default async function HomePage() {
  const locale = 'fr';
  const supabase = await createClient();
  const serverNow = new Date().toISOString();

  const [{ data: flash }, { data: products }, { data: bestSellers }, { data: packs }, { data: categories }, { count: catalogueCount }] = await Promise.all([
    supabase
      .from('flash_sales')
      .select('id, title, ends_at, flash_sale_items(id, flash_price, allocated_qty, remaining_qty, product:products(slug, title, brand, images, market_price, outlet_price, currency))')
      .lte('starts_at', serverNow)
      .gte('ends_at', serverNow)
      .order('ends_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('products')
      .select('id, slug, title, brand, images, market_price, outlet_price, currency, category_id, quantity, velocity_14d, views, description')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('products')
      .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity, velocity_14d, views, description')
      .eq('status', 'published')
      .order('velocity_14d', { ascending: false })
      .limit(12),
    supabase
      .from('packs')
      .select('id, slug, title, narrative, composed_img, pack_price, pack_items(qty, product:products(outlet_price))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('categories')
      .select('id, slug, name, universe, parent_id, icon')
      .order('slug', { ascending: true }),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gt('quantity', 0),
  ]);

  const flashMap = await getActiveFlashMap();
  const productsF = (products ?? []).map((p) => withFlash(p, flashMap));
  const bestSellersF = (bestSellers ?? []).map((p) => withFlash(p, flashMap));
  const topDeal = (products ?? [])
    .map((p) => ({ p, pct: discountPct(p.market_price, p.outlet_price) ?? 0 }))
    .sort((a, b) => b.pct - a.pct)[0];
  const dailyRush = pickDailyRush(productsF.filter((p) => (p.quantity ?? 1) > 0), 8);
  const rotationSeconds = secondsUntilRotation();

  // ── Signaux 100% RÉELS ──
  const { data: salesData } = await supabase.rpc('sales_last_24h');
  const soldById = new Map((salesData ?? []).map((r) => [r.product_id, Number(r.sold)]));
  const adjuges24h = [...soldById.values()].reduce((s, n) => s + n, 0);
  const lotsEnVacation = (flash?.flash_sale_items ?? []).filter((i) => i.product && Number(i.remaining_qty) > 0).length;

  const rootCategories = (categories ?? []).filter((c) => !c.parent_id);
  const maisons = [...new Set((products ?? []).map((p) => p.brand).filter(Boolean))].slice(0, 14);

  // Fil des dernières adjudications : de vrais lots vendus (24h), sans aucune donnée personnelle
  const tickerLots = (products ?? [])
    .filter((p) => soldById.get(p.id))
    .slice(0, 12)
    .map((p) => ({ slug: p.slug, title: localized(p.title, locale), pct: discountPct(p.market_price, p.outlet_price) ?? 0 }));

  const salleStats = [
    { n: adjuges24h, k: 'lots adjugés · 24 h' },
    { n: lotsEnVacation, k: 'lots en vacation' },
    { n: catalogueCount ?? 0, k: 'lots au catalogue' },
  ];

  const crieur = [
    "Jusqu'à −80 %", "Lots 100 % authentiques", "Pièce unique, jamais réassortie",
    "Prix marché vérifiés multi-sources", "Adjugé, à vous", "Livraison suivie",
  ];

  return (
    <main className="min-h-dvh">
      <SiteHeader categories={rootCategories} locale={locale} />

      {/* HERO — « Chinez le lot » */}
      <Hero
        product={topDeal?.p ?? null}
        pct={topDeal?.pct ?? 0}
        products={(products ?? []).filter((p) => (p.images ?? []).length && p.market_price).slice(0, 20)}
        locale={locale}
      />

      {/* LE BANDEAU DU CRIEUR — annonces défilantes (pas de texte gravé, pur HTML) */}
      <div className="criee-band py-2.5 overflow-hidden">
        <div className="marquee-track gap-10">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-10 shrink-0 pr-10" aria-hidden={k === 1}>
              {crieur.map((c, j) => (
                <span key={j} className="crieur-item">
                  <span className="crieur-sep">§</span> {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* LA VACATION EN COURS — rail flash */}
      {flash ? (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-accent" />
              </span>
              <div>
                <p className="eyebrow eyebrow-hot">Vacation en cours</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl leading-tight">{localized(flash.title, locale)}</h2>
              </div>
            </div>
            <Link href="/flash" className="flex items-baseline gap-2 text-app-muted text-sm hover:text-app-text transition-colors duration-120">
              <span>Clôture dans</span>
              <Countdown endsAt={flash.ends_at} serverNow={serverNow} className="chrono-vacation text-2xl" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x">
            {(flash.flash_sale_items ?? []).filter((i) => i.product).map((item) => (
              <FlashCard key={item.id} item={item} locale={locale} variant="rail"
                labels={{ lastPiece: t(locale, 'last_piece'), left: t(locale, 'stock_left') }} />
            ))}
          </div>
        </section>
      ) : null}

      {/* LES LOTS DU JOUR — sélection tournante */}
      {dailyRush.length ? (
        <section className="max-w-7xl mx-auto px-4 pt-12">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="eyebrow">Le catalogue du jour</p>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl mt-1">Les lots du jour</h2>
              <p className="text-app-muted text-sm mt-1">Une sélection qui tourne chaque nuit. Ces pièces partent, d'autres entrent en salle.</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-app-muted">Renouvellement dans</span>
              <RotationTimer initialSeconds={rotationSeconds} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
            {dailyRush.map((p, i) => (
              <ProductCard key={p.id} product={p} locale={locale} index={i} sold={soldById.get(p.id) ?? 0} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/rush" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-display font-bold bg-app-surface border border-app-loot/20 hover:border-app-loot hover:text-app-loot transition-colors duration-120">
              <Hammer size={16} strokeWidth={2} /> Entrer dans la salle — mode plein écran
            </Link>
          </div>
        </section>
      ) : null}

      {/* POURQUOI SI PEU CHER — l'avant/après prix, sur un vrai lot */}
      {topDeal?.p && topDeal.pct > 0 ? (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <div className="card-lot p-7 md:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="space-y-4">
              <p className="eyebrow eyebrow-hot">Pourquoi si peu cher ?</p>
              <h2 className="display-hero text-3xl md:text-4xl leading-tight">
                Même lot. Même authenticité.<br />Jusqu'à <span className="text-app-loot">−{topDeal.pct}%</span>.
              </h2>
              <p className="text-app-muted max-w-md leading-relaxed">
                Ce ne sont pas des contrefaçons ni des défauts : ce sont des fins de série et
                des invendus de marque, catalogués comme des lots et adjugés sous le prix du marché.
              </p>
              <Link href={`/product/${topDeal.p.slug}`} className="btn-hammer px-6 py-3 inline-flex">
                <Gavel size={16} strokeWidth={2} /> Voir ce lot
              </Link>
            </div>
            <div className="flex md:flex-col items-center justify-center gap-4 md:gap-3 text-center">
              <div>
                <p className="eyebrow">Prix marché</p>
                <s className="num text-app-muted text-2xl md:text-3xl">
                  <Money amount={topDeal.p.market_price} />
                </s>
              </div>
              <ArrowRight size={22} className="text-app-loot rotate-0 md:rotate-90 shrink-0" strokeWidth={2} />
              <div>
                <p className="eyebrow eyebrow-hot">Au marteau</p>
                <p className="num-loot text-4xl md:text-5xl font-bold loot-drop">
                  <Money amount={topDeal.p.outlet_price} />
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* VITRINE ÉDITORIALE — « Luxe » (image Supabase à uploader : site/vitrine-luxe.jpg) */}
      <section className="max-w-7xl mx-auto px-4 pt-14">
        <EditorialVitrine
          image="site/vitrine-luxe.jpg"
          align="left"
          eyebrow="La salle"
          title={<>Le luxe ne devrait pas<br />coûter le luxe.</>}
          subtitle="Des pièces de maison, éclairées comme au pupitre. Adjugées sous leur prix, jamais sous leur valeur."
          cta="Parcourir les lots rares"
          href="/shop"
        />
      </section>

      {/* DE LA MARQUE AU MARTEAU — la pédagogie du prix */}
      <section className="max-w-7xl mx-auto px-4 pt-14">
        <div className="text-center mb-6">
          <p className="eyebrow">La mécanique</p>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl mt-1">De la marque au marteau</h2>
        </div>
        <div className="card-lot flow-marteau overflow-hidden">
          {[
            { k: 'Marque', v: 'produit officiel' },
            { k: 'Fin de série', v: 'invendu, surplus' },
            { k: 'OUTRUSH', v: 'catalogué en lot' },
            { k: 'Au marteau', v: 'prix sous le marché', final: true },
            { k: 'Vous', v: "l'économie remportée", final: true },
          ].map((s, i) => (
            <div key={i} className={`flow-step ${s.final ? 'flow-final' : ''}`}>
              <p className="flow-k">{s.k}</p>
              <p className="flow-v">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LES MAISONS REPRÉSENTÉES — marques réelles du catalogue */}
      {maisons.length >= 3 ? (
        <section className="pt-14">
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <p className="eyebrow text-center">Les maisons représentées</p>
          </div>
          <div className="criee-band py-5 overflow-hidden">
            <div className="marquee-track gap-12">
              {[...Array(2)].map((_, k) => (
                <div key={k} className="flex gap-12 shrink-0 pr-12" aria-hidden={k === 1}>
                  {maisons.map((m, j) => (
                    <span key={j} className="maisons-item">{m}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* EXPLORER LES UNIVERS */}
      {rootCategories.length ? (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="eyebrow">Le catalogue</p>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl mt-1">Explorer les univers</h2>
              <div className="rule-accent mt-2" />
            </div>
            <span className="text-sm text-app-muted num">{rootCategories.length} univers</span>
          </div>
          <CategoryGrid categories={rootCategories} locale={locale} />
        </section>
      ) : null}

      {/* LES PLUS DISPUTÉS — rail */}
      {bestSellersF?.length ? (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="eyebrow eyebrow-hot">En ce moment</p>
              <h2 className="font-display font-bold text-2xl mt-1">Les plus disputés</h2>
            </div>
            <Link href="/shop" className="text-sm text-app-muted hover:text-app-loot transition-colors duration-120">tout voir</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x items-stretch">
            {bestSellersF.map((p, i) => (
              <div key={p.id} className="snap-start shrink-0 w-44 sm:w-48 flex">
                <ProductCard product={p} locale={locale} index={i} sold={soldById.get(p.id) ?? 0} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* LA SALLE EN DIRECT — compteurs réels + dernières adjudications réelles */}
      {(adjuges24h > 0 || (catalogueCount ?? 0) > 0) ? (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="eyebrow eyebrow-hot inline-flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-app-accent" />
                </span>
                En direct
              </p>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl mt-1">La salle en direct</h2>
            </div>
            <AdjudicationsTicker lots={tickerLots} />
          </div>
          <SalleEnDirect stats={salleStats} />
        </section>
      ) : null}

      {/* LE CABINET — packs (lots mariés) */}
      {packs?.length ? (
        <section className="max-w-7xl mx-auto px-4 pt-8">
          <p className="eyebrow">Assemblés par la maison</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl mt-1 mb-2">Le cabinet — lots mariés</h2>
          <p className="text-app-muted mb-6">Des pièces réunies pour aller ensemble — adjugées moins cher qu'à l'unité.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pk, i) => {
              const sumOutlet = (pk.pack_items ?? []).reduce((s, it) => s + Number(it.product?.outlet_price ?? 0) * it.qty, 0);
              const pct = sumOutlet > 0 ? Math.round(((sumOutlet - Number(pk.pack_price)) / sumOutlet) * 100) : 0;
              const img = pk.composed_img
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${pk.composed_img}`
                : null;
              return (
                <Link key={pk.id} href={`/pack/${pk.slug}`} className="card-lot rise-in overflow-hidden group" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="aspect-[3/2] bg-app-surface-2 relative overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="media-zoom w-full h-full object-cover" />
                    ) : (
                      <div className="vitrine-fallback" aria-hidden="true" />
                    )}
                    {pct > 0 ? <span className="seal absolute top-3 left-3">CABINET −{pct}%</span> : null}
                  </div>
                  <div className="p-4">
                    <p className="font-medium leading-snug line-clamp-1">{localized(pk.title, locale)}</p>
                    <p className="num-loot font-bold mt-1"><Money amount={pk.pack_price} /></p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* LE LOT MYSTÈRE — surprise box */}
      <section className="max-w-7xl mx-auto px-4 pt-12">
        <Link href="/surprise-box" className="card-lot block p-8 md:p-10 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(ellipse at 20% 0%, oklch(78% 0.13 85 / 0.12), transparent 60%)' }} />
          <div className="relative flex items-center gap-6 flex-wrap md:flex-nowrap">
            <div className="w-14 h-14 rounded-xl grid place-items-center bg-app-loot/12 border border-app-loot/30 shrink-0">
              <Package size={26} strokeWidth={1.8} className="text-app-loot" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">Sous le voile</p>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl mt-1">Le lot mystère</h2>
              <p className="text-app-muted max-w-md mt-1">Fixez un budget — la maison compose un lot scellé d'une valeur toujours supérieure.</p>
            </div>
            <span className="btn-hammer px-6 py-3 shrink-0 pointer-events-none inline-flex">Composer mon lot</span>
          </div>
        </Link>
      </section>

      {/* VITRINE FINALE (image Supabase à uploader : site/vitrine-cta.jpg) */}
      <section className="max-w-7xl mx-auto px-4 pt-14">
        <EditorialVitrine
          image="site/vitrine-cta.jpg"
          align="center"
          height="h-[340px] md:h-[420px]"
          eyebrow="La maison de ventes de l'invendu"
          title={<>Regardez mieux.<br />Payez moins.</>}
          cta="Entrer en salle"
          href="/shop"
        />
      </section>

      {/* LE CARNET DE LA MAISON — devenir enchérisseur (compte réel) */}
      <section className="max-w-7xl mx-auto px-4 pt-14">
        <div className="card-lot p-8 md:p-10 flex items-center gap-6 flex-wrap md:flex-nowrap">
          <ShieldCheck size={30} strokeWidth={1.6} className="text-app-loot shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="eyebrow eyebrow-hot">Le carnet de la maison</p>
            <h2 className="font-display font-bold text-xl md:text-2xl mt-1">Devenez enchérisseur</h2>
            <p className="text-app-muted mt-1 max-w-lg">Ouvrez votre carnet : suivez vos lots, gardez l'œil sur les vacations et accédez aux ouvertures avant la salle.</p>
          </div>
          <Link href="/login" className="btn-hammer px-6 py-3 shrink-0 inline-flex"><Sparkles size={16} strokeWidth={2} /> Ouvrir mon carnet</Link>
        </div>
      </section>

      {/* LE CATALOGUE COMPLET */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <p className="eyebrow">Toute la salle</p>
        <h2 className="font-display font-bold text-2xl md:text-3xl mt-1 mb-2">Le catalogue</h2>
        <p className="text-app-muted mb-8">Prix marché vérifiés multi-sources. Remises scellées, pas promises.</p>
        {productsF?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
            {productsF.map((p, i) => (
              <ProductCard key={p.id} product={p} locale={locale} index={i} sold={soldById.get(p.id) ?? 0} />
            ))}
          </div>
        ) : (
          <div className="card-lot p-16 text-center space-y-3">
            <Gavel size={44} strokeWidth={1.4} className="mx-auto text-app-loot opacity-50" />
            <p className="text-app-muted">{t(locale, 'hunt_empty')}</p>
            <p className="text-sm text-app-muted">
              Côté maison ? <Link href="/admin/products/new" className="text-app-loot">Cataloguer le premier lot</Link>.
            </p>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
