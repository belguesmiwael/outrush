export const LOCALES = ['fr', 'en', 'ar'];
export const RTL_LOCALES = ['ar'];

export const dict = {
  fr: {
    flash_now: 'FLASH EN COURS',
    ends_in: 'Se termine dans',
    verified_price: 'Prix constaté le',
    add_to_cart: 'Ajouter au panier',
    last_piece: 'Dernière pièce',
    stock_left: 'restants',
    savings: 'Économie',
    hunt_empty: 'Aucune chasse en cours — le prochain drop arrive.',
    checkout: 'Commander',
  },
  en: {
    flash_now: 'FLASH LIVE',
    ends_in: 'Ends in',
    verified_price: 'Price seen on',
    add_to_cart: 'Add to cart',
    last_piece: 'Last piece',
    stock_left: 'left',
    savings: 'You save',
    hunt_empty: 'No hunt in progress — the next drop is coming.',
    checkout: 'Checkout',
  },
  ar: {
    flash_now: 'عرض فلاش الآن',
    ends_in: 'ينتهي خلال',
    verified_price: 'السعر المُتحقق منه في',
    add_to_cart: 'أضف إلى السلة',
    last_piece: 'القطعة الأخيرة',
    stock_left: 'متبقي',
    savings: 'توفيرك',
    hunt_empty: 'لا يوجد صيد جارٍ — العرض القادم قريب.',
    checkout: 'إتمام الشراء',
  },
};

export function t(locale, key) {
  return dict[locale]?.[key] ?? dict.fr[key] ?? key;
}

export function localized(jsonb, locale = 'fr') {
  if (!jsonb) return '';
  if (typeof jsonb === 'string') return jsonb;
  return jsonb[locale] ?? jsonb.fr ?? jsonb.en ?? Object.values(jsonb)[0] ?? '';
}
