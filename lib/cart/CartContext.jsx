'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const CartContext = createContext(null);
const STORAGE_KEY = 'outrush_cart_v1';
const SESSION_KEY = 'outrush_session_v1';

function getSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = (crypto.randomUUID?.() ?? String(Math.random()).slice(2));
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch { return null; }
}

// Pose une réservation panier réelle (pour le compteur "au panier" temps réel)
async function reserve(productId, qty) {
  try {
    const sid = getSessionId();
    if (!sid) return;
    const supabase = createClient();
    await supabase.rpc('reserve_cart', { p_product: productId, p_session: sid, p_qty: qty });
  } catch { /* silencieux : le panier local reste prioritaire */ }
}
async function release(productId) {
  try {
    const sid = getSessionId();
    if (!sid) return;
    const supabase = createClient();
    await supabase.rpc('release_cart', { p_product: productId, p_session: sid });
  } catch { /* silencieux */ }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
    }
  }, [items, hydrated]);

  const add = useCallback((product, qty = 1, opts = {}) => {
    reserve(product.id, qty);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: Math.min(i.qty + qty, product.quantity ?? 99) } : i));
      }
      return [...prev, {
        id: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        image: (product.images ?? [])[0] ?? null,
        outlet_price: Number(product.flash?.price ?? product.outlet_price),
        is_flash: Boolean(product.flash),
        currency: product.currency ?? 'USD',
        max: product.flash?.remaining ?? product.quantity ?? 99,
        qty,
      }];
    });
    if (opts.openDrawer !== false) setOpen(true);
  }, []);

  const remove = useCallback((id) => { release(id); setItems((prev) => prev.filter((i) => i.id !== id)); }, []);
  const setQty = useCallback((id, qty) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.max)) } : i)));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.outlet_price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, remove, setQty, clear, open, setOpen, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
