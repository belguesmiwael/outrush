'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { classifyStockNow } from '@/lib/actions/packs';

export default function StockClassifier() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  function run() {
    setMsg(null);
    start(async () => {
      try {
        const res = await classifyStockNow();
        if (res?.ok) {
          setMsg({
            type: 'ok',
            text: `Stock classé : ${res.heroes} héros · ${res.dormants} dormants → ${res.suggestions} pack(s) suggéré(s)${res.proxy ? ' (estimation, pas encore d\'historique de ventes)' : ''}.`,
          });
          router.refresh();
        } else {
          setMsg({ type: 'err', text: res?.detail ?? res?.error ?? 'Échec' });
        }
      } catch {
        setMsg({ type: 'err', text: 'Erreur serveur' });
      }
    });
  }

  return (
    <div className="card-hunt p-5 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow eyebrow-hot">Stock Intelligence</p>
          <h3 className="font-display font-bold mt-1">Classer le stock & générer des packs</h3>
          <p className="text-app-muted text-sm mt-1">Analyse la vélocité (héros / dormants) puis propose des packs. À lancer avant de générer des packs.</p>
        </div>
        <button onClick={run} disabled={pending} className="btn-rush disabled:opacity-50 shrink-0">
          {pending ? 'Analyse…' : '⚡ Classer maintenant'}
        </button>
      </div>
      {msg ? (
        <p className={`text-sm ${msg.type === 'ok' ? 'text-app-success' : 'text-app-accent'}`}>{msg.text}</p>
      ) : null}
    </div>
  );
}
