'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Visiteurs en direct RÉELS sur un produit, via Supabase Realtime presence.
 * Affiche le vrai nombre de personnes présentes (au moins 1 : vous).
 * Aucune donnée inventée.
 */
export default function LiveViewers({ productId, className = '' }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!productId) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:product:${productId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: Date.now() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [productId]);

  if (count < 2) return null; // n'affiche rien si vous êtes seul (pas de faux signal)

  return (
    <span className={`px-2.5 py-1 rounded-full bg-app-success/15 text-app-success font-medium inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-success opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-app-success" />
      </span>
      {count} regardent
    </span>
  );
}
