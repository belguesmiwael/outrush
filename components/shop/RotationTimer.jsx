'use client';
import { useEffect, useState } from 'react';

function fmt(total) {
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return { h, m, s };
}

/** Compte à rebours jusqu'à minuit UTC (prochaine rotation du Daily Rush). */
export default function RotationTimer({ initialSeconds }) {
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const id = setInterval(() => setLeft((v) => (v <= 0 ? 0 : v - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const { h, m, s } = fmt(Math.max(0, left));
  return (
    <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums">
      <Seg v={h} />
      <span className="text-app-accent">:</span>
      <Seg v={m} />
      <span className="text-app-accent">:</span>
      <Seg v={s} />
    </span>
  );
}

function Seg({ v }) {
  return (
    <span className="bg-app-surface-2 rounded-md px-1.5 py-0.5 border border-white/8">{v}</span>
  );
}
