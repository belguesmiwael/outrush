'use client';
import { useEffect, useState } from 'react';

/**
 * Chrono serveur-authoritative : endsAt vient de la DB, serverNow du rendu serveur.
 * Offset horloge client/serveur calculé une fois -> l'heure client ne fait pas foi.
 */
export default function Countdown({ endsAt, serverNow, className = '' }) {
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - (Date.now() + offset))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(endsAt).getTime() - (Date.now() + offset)));
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, offset]);

  const total = Math.floor(remaining / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');

  return (
    <span className={`font-display tabular-nums tracking-tight ${className}`} role="timer" aria-live="off">
      <span className="chrono-digit">{h}</span>
      <span className="opacity-50">:</span>
      <span className="chrono-digit">{m}</span>
      <span className="opacity-50">:</span>
      <span className="chrono-digit" key={s}>{s}</span>
    </span>
  );
}
