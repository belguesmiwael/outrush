'use client';
import { createContext, useContext } from 'react';

const SYMBOLS = { USD: '$', EUR: '€', TND: 'DT' };
const CurrencyContext = createContext({ currency: 'USD', rate: 1, symbol: '$' });

export function CurrencyProvider({ currency = 'USD', rate = 1, children }) {
  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol: SYMBOLS[currency] ?? currency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Convertit un montant USD vers la devise d'affichage et le formate. */
export function displayMoney(amountUsd, ctx) {
  const currency = ctx?.currency ?? 'USD';
  const rate = Number(ctx?.rate) || 1;
  const symbol = ctx?.symbol ?? SYMBOLS[currency] ?? '$';
  const n = Number(amountUsd);
  const v = (Number.isFinite(n) ? n : 0) * rate;
  const formatted = v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'TND' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
