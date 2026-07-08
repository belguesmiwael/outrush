'use client';
import { useEffect, useRef, useState } from 'react';

// LA CRIÉE — « La salle en direct ». Chiffres 100% RÉELS passés en props
// (aucun compteur inventé) ; seule l'animation de comptage est décorative.
function CountUp({ to, duration = 900 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setN(to); return; }

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref} className="stat-n num">{n.toLocaleString('fr-FR')}</span>;
}

export default function SalleEnDirect({ stats = [] }) {
  // stats: [{ n: number, k: string }]
  const real = stats.filter((s) => Number(s.n) > 0);
  if (!real.length) return null;
  return (
    <div className={`grid gap-4 ${real.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {real.map((s, i) => (
        <div key={i} className="salle-stat rise-in" style={{ animationDelay: `${i * 80}ms` }}>
          <CountUp to={Number(s.n)} />
          <p className="stat-k">{s.k}</p>
        </div>
      ))}
    </div>
  );
}
