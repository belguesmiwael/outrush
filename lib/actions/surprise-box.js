'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const BudgetSchema = z.object({
  budget: z.coerce.number().min(20).max(1000),
  universe: z.string().max(40).optional().or(z.literal('')),
});

/**
 * Surprise Box — le client paie X, reçoit une box de valeur SUPÉRIEURE.
 * Priorité aux dormants (on vide le stock) tout en garantissant au client
 * une valeur marché ≥ 1.5× son budget. Composition déterministe côté serveur.
 */
export async function composeSurpriseBox(prevState, formData) {
  const parsed = BudgetSchema.safeParse({
    budget: formData.get('budget'),
    universe: formData.get('universe') ?? '',
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { budget, universe } = parsed.data;

  const supabase = await createClient();

  // Catégories de l'univers choisi (optionnel)
  let categoryIds = null;
  if (universe) {
    const { data: cats } = await supabase.from('categories').select('id').eq('universe', universe);
    categoryIds = (cats ?? []).map((c) => c.id);
  }

  let query = supabase
    .from('products')
    .select('id, slug, title, brand, images, market_price, outlet_price, currency, quantity, stock_class, category_id')
    .eq('status', 'published')
    .gt('quantity', 0)
    .not('market_price', 'is', null)
    .limit(300);
  if (categoryIds?.length) query = query.in('category_id', categoryIds);

  const { data: pool } = await query;
  if (!pool || pool.length < 3) return { ok: false, error: 'not_enough_stock' };

  // Cible de valeur marché : 1.5× le budget. On privilégie les dormants.
  const targetValue = budget * 1.5;
  const sorted = [...pool].sort((a, b) => {
    // dormants d'abord, puis meilleur ratio valeur/prix
    const da = a.stock_class === 'dormant' ? 0 : 1;
    const db = b.stock_class === 'dormant' ? 0 : 1;
    if (da !== db) return da - db;
    return Number(b.market_price) / Number(b.outlet_price) - Number(a.market_price) / Number(a.outlet_price);
  });

  const box = [];
  let value = 0;
  let cost = 0;
  for (const p of sorted) {
    if (value >= targetValue) break;
    if (Number(p.outlet_price) > budget * 0.9) continue; // garder de la marge
    if (cost + Number(p.outlet_price) > budget) continue; // rester sous le budget en coût réel
    box.push(p);
    value += Number(p.market_price);
    cost += Number(p.outlet_price);
    if (box.length >= 8) break;
  }

  if (box.length < 2) return { ok: false, error: 'no_fit' };

  return {
    ok: true,
    budget,
    box: box.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      images: p.images,
      market_price: p.market_price,
      currency: p.currency,
    })),
    total_value: Math.round(value * 100) / 100,
    count: box.length,
    savings: Math.round((value - budget) * 100) / 100,
  };
}
