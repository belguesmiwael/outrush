'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function RecoverScansButton({ count }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  function recover() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/scan/recover', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        setMsg(res.ok ? `${json.recovered ?? 0} fiche(s) relancée(s).` : 'Échec de la relance.');
        router.refresh();
      } catch {
        setMsg('Échec réseau.');
      }
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap card-hunt p-4">
      <span className="text-sm text-app-accent flex-1">
        ⏱ {count} scan(s) en cours d'enquête.
      </span>
      <button
        onClick={recover}
        disabled={pending}
        className="rounded-lg px-4 py-2 text-sm font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 hover:scale-[1.02] active:scale-95"
      >
        {pending ? 'Relance…' : '↻ Relancer maintenant'}
      </button>
      {msg ? <span className="text-xs text-app-muted w-full">{msg}</span> : null}
    </div>
  );
}
