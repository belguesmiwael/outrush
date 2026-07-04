'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useCurrency, displayMoney } from '@/lib/currency/CurrencyContext';

function mediaUrl(path) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}` : null;
}

let idc = 0;

/**
 * Espace de jeu du hero : de VRAIS produits tombent du plafond. Le curseur
 * devient une cible ; toucher un produit l'explose et fait tomber l'economie
 * REELLE (prix marche - prix outlet) avec son de tir + son de piece. Les produits
 * rates s'accumulent au sol. Aucun cadre : la section entiere est la piece.
 */
export default function HeroGame({ products = [], locale = 'fr' }) {
  const cur = useCurrency();
  const zoneRef = useRef(null);
  const [items, setItems] = useState([]);
  const [landed, setLanded] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [coins, setCoins] = useState([]);
  const [saved, setSaved] = useState(0);
  const [target, setTarget] = useState({ x: -100, y: -100, active: false });
  const audioRef = useRef(null);
  const reduced = useRef(false);
  const pool = useRef([]);

  // Pool de produits reels avec image + economie reelle
  useEffect(() => {
    pool.current = (products ?? [])
      .filter((p) => (p.images ?? []).length && p.market_price && p.outlet_price)
      .map((p) => ({
        slug: p.slug,
        img: mediaUrl(p.images[0]),
        saving: Math.max(0, Number(p.market_price) - Number(p.outlet_price)),
      }));
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, [products]);

  function ac() {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return audioRef.current;
  }
  const shotSound = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const dur = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.22, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1600;
    src.connect(flt).connect(g).connect(ctx.destination); src.start();
  }, []);
  const coinSound = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    [988, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.13);
    });
  }, []);

  // Spawn de produits reels depuis le plafond
  useEffect(() => {
    if (reduced.current) return;
    const spawn = setInterval(() => {
      if (!pool.current.length) return;
      setItems((prev) => {
        if (prev.length > 6) return prev;
        const src = pool.current[Math.floor(Math.random() * pool.current.length)];
        return [...prev, {
          id: ++idc, ...src,
          x: 8 + Math.random() * 88,
          y: -6,
          speed: 0.16 + Math.random() * 0.2,
          rot: -12 + Math.random() * 24,
        }];
      });
    }, 1100);
    return () => clearInterval(spawn);
  }, []);

  // Boucle : chute + accumulation au sol + pieces
  useEffect(() => {
    if (reduced.current) return;
    let raf;
    const tick = () => {
      setItems((prev) => {
        const still = [];
        for (const it of prev) {
          const ny = it.y + it.speed;
          if (ny >= 92) {
            // Rate : tombe au sol et s'accumule
            setLanded((l) => [...l, { id: it.id, img: it.img, x: it.x, rot: it.rot }].slice(-14));
          } else {
            still.push({ ...it, y: ny });
          }
        }
        return still;
      });
      setCoins((prev) => prev.map((c) => ({ ...c, y: c.y + c.vy, vy: c.vy + 0.04, life: c.life - 1 })).filter((c) => c.life > 0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const explode = useCallback((it) => {
    setBursts((b) => [...b, { id: it.id, x: it.x, y: it.y }]);
    setCoins((c) => [...c, { id: ++idc, x: it.x, y: it.y, vy: 0.3, life: 55, amount: it.saving }]);
    setSaved((s) => s + it.saving);
    shotSound(); coinSound();
    setTimeout(() => setBursts((bb) => bb.filter((b) => b.id !== it.id)), 400);
  }, [shotSound, coinSound]);

  function onMove(e) {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTarget({ x, y, active: true });
    setItems((prev) => {
      const remaining = [];
      let hit = null;
      for (const it of prev) {
        if (!hit && Math.hypot(it.x - x, (it.y - y) * (rect.height / rect.width)) < 6) hit = it;
        else remaining.push(it);
      }
      if (hit) { explode(hit); return remaining; }
      return prev;
    });
  }

  const hasProducts = (products ?? []).some((p) => (p.images ?? []).length);

  return (
    <div
      ref={zoneRef}
      onMouseMove={onMove}
      onMouseLeave={() => setTarget((t) => ({ ...t, active: false }))}
      className="absolute inset-0 z-10 overflow-hidden select-none"
      style={{ cursor: 'none' }}
    >
      {/* Ligne de sol */}
      <div className="absolute inset-x-0" style={{ top: '92%', height: '1px', background: 'linear-gradient(90deg, transparent, oklch(62% 0.24 25 / 0.3), transparent)' }} />

      {/* Compteur d'economies (a droite pour ne pas gener le texte) */}
      <div className="absolute top-5 right-5 z-20 pointer-events-none text-right">
        <p className="text-[10px] uppercase tracking-[0.3em] text-app-muted">Economies chassees</p>
        <p className="font-display font-extrabold text-3xl text-app-success tabular-nums">{displayMoney(saved, cur)}</p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-app-accent mt-1">Visez - Tirez</p>
      </div>

      {/* Produits qui tombent */}
      {items.map((it) => (
        <div key={it.id} className="absolute z-10 pointer-events-none"
          style={{ left: `${it.x}%`, top: `${it.y}%`, transform: `translate(-50%,-50%) rotate(${it.rot}deg)` }}>
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/15 shadow-lg" style={{ background: 'oklch(20% 0.02 264)' }}>
            {it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : null}
          </div>
        </div>
      ))}

      {/* Produits rates accumules au sol */}
      {landed.map((l, i) => (
        <div key={l.id} className="absolute z-[9] pointer-events-none"
          style={{ left: `${l.x}%`, top: `${92 - (i % 3) * 2}%`, transform: `translate(-50%,-100%) rotate(${l.rot}deg)`, opacity: 0.55 }}>
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 grayscale" style={{ background: 'oklch(18% 0.02 264)' }}>
            {l.img ? <img src={l.img} alt="" className="w-full h-full object-cover" /> : null}
          </div>
        </div>
      ))}

      {/* Explosions */}
      {bursts.map((b) => (
        <div key={b.id} className="absolute z-10 pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className="hg-burst" />
        </div>
      ))}

      {/* Economie reelle qui tombe */}
      {coins.map((c) => (
        <div key={c.id} className="absolute z-10 pointer-events-none flex items-center gap-1 font-display font-extrabold text-app-success text-sm"
          style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)', opacity: c.life / 55 }}>
          <span>+{displayMoney(c.amount, cur)}</span>
        </div>
      ))}

      {/* Curseur cible */}
      {target.active ? (
        <div className="absolute z-30 pointer-events-none" style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className="hg-crosshair" />
        </div>
      ) : null}

      {!hasProducts ? (
        <div className="absolute bottom-16 right-6 z-20 text-xs text-app-muted pointer-events-none">
          Ajoutez des produits pour lancer la chasse
        </div>
      ) : null}

      <style>{`
        .hg-crosshair { width: 46px; height: 46px; border: 2px solid var(--app-accent); border-radius: 50%; position: relative; box-shadow: 0 0 20px oklch(62% 0.24 25 / 0.6); }
        .hg-crosshair::before, .hg-crosshair::after { content: ''; position: absolute; background: var(--app-accent); }
        .hg-crosshair::before { width: 2px; height: 14px; left: 50%; top: -8px; transform: translateX(-50%); }
        .hg-crosshair::after { width: 14px; height: 2px; top: 50%; left: -8px; transform: translateY(-50%); }
        .hg-burst { width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle, oklch(62% 0.24 25 / 0.9), transparent 70%); animation: hgBurst 0.4s ease-out forwards; }
        @keyframes hgBurst { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </div>
  );
}
