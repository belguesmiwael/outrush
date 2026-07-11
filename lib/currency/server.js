import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

const SYMBOLS = { USD: '$', EUR: '€', TND: 'DT' };

/**
 * Devise d'affichage + taux (base USD), lus depuis app_settings.
 * Lecture PUBLIQUE, mise en cache 60 s (tag 'currency') → plus de requête DB à
 * chaque page, plus de rendu dynamique forcé. Revalidé au changement de réglage.
 */
export const getCurrencySettings = unstable_cache(
  async () => {
    try {
      const supabase = createPublicClient();
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
  },
  ['currency-settings'],
  { revalidate: 60, tags: ['currency'] }
);

export { SYMBOLS };
