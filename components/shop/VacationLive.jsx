'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users } from 'lucide-react';

/**
 * LA CRIÉE — le cœur vivant d'une vacation.
 * - « N enchérisseurs en salle » = présence Supabase Realtime RÉELLE (vous compris).
 * - Les appels « Une fois… / Deux fois… / Dernière enchère » sont dérivés du temps
 *   restant réel (ends_at serveur). Aucun compteur inventé.
 */
export default function VacationLive({ saleId, endsAt }) {
  const [count, setCount] = useState(1);
  const [call, setCall] = useState(null);

  // Présence réelle dans la salle
  useEffect(() => {
    if (!saleId) return;
    const supabase = createClient();
    const uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID() : `u-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(`presence:vacation:${saleId}`, { config: { presence: { key: uid } } });
    ch.on('presence', { event: 'sync' }, () => {
      setCount(Math.max(1, Object.keys(ch.presenceState()).length));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [saleId]);

  // Appels du commissaire selon le temps restant réel
  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const rem = Math.floor((end - Date.now()) / 1000);
      if (rem <= 0) setCall({ text: 'Adjugé.', urgent: true });
      else if (rem <= 60) setCall({ text: 'Dernière enchère…', urgent: true });
      else if (rem <= 120) setCall({ text: 'Deux fois…', urgent: true });
      else if (rem <= 300) setCall({ text: 'Une fois…', urgent: false });
      else setCall(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      <span className="inline-flex items-center gap-2 text-sm text-app-muted">
        <Users size={15} strokeWidth={2} className="text-app-loot" />
        <span className="num text-app-text">{count}</span> {count > 1 ? 'enchérisseurs en salle' : 'enchérisseur en salle'}
      </span>
      {call ? (
        <span className={`criee-call text-lg ${call.urgent ? 'call-pulse' : ''}`}>{call.text}</span>
      ) : null}
    </div>
  );
}
