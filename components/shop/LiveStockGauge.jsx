'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LiveStockGauge({ itemId, allocated, initialRemaining, label }) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`flash-item-${itemId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flash_sale_items', filter: `id=eq.${itemId}` },
        (payload) => {
          const next = Number(payload.new?.remaining_qty);
          if (Number.isFinite(next)) setRemaining(next);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  const pct = allocated > 0 ? Math.max(0, Math.min(100, (remaining / allocated) * 100)) : 0;
  const lastPiece = remaining === 1;

  return (
    <div className="space-y-1.5">
      <div className="stock-gauge">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs ${lastPiece ? 'last-piece font-bold' : 'text-app-muted'}`}>
        {lastPiece ? label.lastPiece : `${remaining} ${label.left}`}
      </p>
    </div>
  );
}
