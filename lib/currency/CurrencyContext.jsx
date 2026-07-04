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
export function displayMoney(amountUsd, { currency, rate, symbol }) {
  const v = Number(amountUsd) * rate;
  const formatted = v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'TND' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
