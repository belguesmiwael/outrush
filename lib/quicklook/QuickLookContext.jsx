'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const QuickLookContext = createContext(null);

export function QuickLookProvider({ children }) {
  const [product, setProduct] = useState(null);
  const open = useCallback((p) => setProduct(p), []);
  const close = useCallback(() => setProduct(null), []);
  return (
    <QuickLookContext.Provider value={{ product, open, close }}>
      {children}
    </QuickLookContext.Provider>
  );
}

export function useQuickLook() {
  const ctx = useContext(QuickLookContext);
  if (!ctx) throw new Error('useQuickLook must be used within QuickLookProvider');
  return ctx;
}
