'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Écoute les nouvelles commandes en temps réel (Realtime sur orders) et affiche
 * un badge + un toast quand une commande arrive pendant que l'admin travaille.
 */
export default function OrderNotifier({ initialPending = 0 }) {
  const [pending, setPending] = useState(initialPending);
  const [toast, setToast] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setPending((p) => p + 1);
        setToast(payload.new?.order_number ?? 'Nouvelle commande');
        try { new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAAAAAAAAAAAAAAA').play().catch(() => {}); } catch {}
        setTimeout(() => setToast(null), 6000);
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return (
    <>
      <Link href="/admin/orders" className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-app-surface hover:bg-app-surface-2 transition-colors duration-120">
        🔔 Commandes
        {pending > 0 ? (
          <span className="min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-app-accent text-white text-[10px] font-bold">{pending}</span>
        ) : null}
      </Link>

      {toast ? (
        <Link
          href="/admin/orders"
          onClick={() => setToast(null)}
          className="fixed bottom-6 right-6 z-[80] card-premium p-4 pr-6 flex items-center gap-3 animate-[reveal-up_0.4s_ease] shadow-2xl"
          style={{ boxShadow: '0 20px 60px oklch(0% 0 0 / 0.5)' }}
        >
          <span className="text-2xl">🛍️</span>
          <div>
            <p className="font-display font-bold text-sm">Nouvelle commande !</p>
            <p className="text-app-accent text-sm font-mono">{toast}</p>
          </div>
        </Link>
      ) : null}
    </>
  );
}
