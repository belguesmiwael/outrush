import { createClient } from '@/lib/supabase/server';

const SYMBOLS = { USD: '$', EUR: '€', TND: 'DT' };

/** Lit la devise d'affichage et les taux depuis app_settings (base USD). */
export async function getCurrencySettings() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['display_currency', 'fx_rates']);
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    const currency = map.get('display_currency') ?? 'USD';
    const rates = map.get('fx_rates') ?? { USD: 1, EUR: 0.92, TND: 3.15 };
    return { currency, rate: Number(rates[currency] ?? 1), rates, symbol: SYMBOLS[currency] ?? currency };
  } catch {
    return { currency: 'USD', rate: 1, rates: { USD: 1 }, symbol: '$' };
  }
}

export { SYMBOLS };
