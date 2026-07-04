'use client';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';

/** Affiche un montant (stocké en USD) dans la devise d'affichage active. */
export default function Money({ amount }) {
  const cur = useCurrency();
  return <>{displayMoney(amount, cur)}</>;
}
