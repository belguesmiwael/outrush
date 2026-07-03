import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount, currency = 'USD', locale = 'fr') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function discountPct(marketPrice, outletPrice) {
  const m = Number(marketPrice);
  const o = Number(outletPrice);
  if (!Number.isFinite(m) || !Number.isFinite(o) || m <= 0 || o < 0 || o >= m) return null;
  return Math.round(((m - o) / m) * 100);
}

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}
