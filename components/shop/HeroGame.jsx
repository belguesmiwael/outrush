'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
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
  const [last, setLast] = useState(null);
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

  // Son de TIROIR-CAISSE (cha-ching) : clac mécanique + double clochette métallique
  const registerSound = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const t0 = ctx.currentTime;

    // 1) Clac du tiroir : bruit court filtré (mécanique)
    const dur = 0.06;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2200;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.3, t0); ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    noise.connect(nf).connect(ng).connect(ctx.destination); noise.start(t0);

    // 2) Double clochette "cha-CHING" : deux dings métalliques
    [[1568, 0.05], [2093, 0.13]].forEach(([f, delay]) => {
      const t = t0 + delay;
      [f, f * 2.01, f * 2.99].forEach((freq, k) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        const amp = 0.12 / (k + 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.42);
      });
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
          x: 52 + Math.random() * 44, // moitié droite uniquement (52%→96%)
          y: -6,
          speed: 0.16 + Math.random() * 0.2,
          rot: -12 + Math.random() * 24,
          size: 44 + Math.round(Math.random() * 52), // taille aléatoire 44→96px
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
    setLast(it.saving);
    registerSound();
    setTimeout(() => setBursts((bb) => bb.filter((b) => b.id !== it.id)), 400);
  }, [registerSound]);

  function onMove(e) {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Coordonnées souris OU tactile
    const point = e.touches?.[0] ?? e;
    const clientX = point.clientX, clientY = point.clientY;
    if (clientX == null) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    // Sur tactile, toute la zone est jouable ; sur souris, moitié droite seulement
    const isTouch = Boolean(e.touches);
    if (!isTouch && x < 50) {
      setTarget((t) => (t.active ? { ...t, active: false } : t));
      return;
    }
    setTarget({ x, y, active: true });

    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setItems((prev) => {
      let hit = null;
      for (const it of prev) {
        const ix = (it.x / 100) * rect.width;
        const iy = (it.y / 100) * rect.height;
        const half = (it.size ?? 60) / 2;
        const margin = isTouch ? 14 : 4; // cible tactile plus tolérante
        if (Math.abs(px - ix) <= half + margin && Math.abs(py - iy) <= half + margin) { hit = it; break; }
      }
      if (hit) { explode(hit); return prev.filter((i) => i.id !== hit.id); }
      return prev;
    });
  }

  const hasProducts = (products ?? []).some((p) => (p.images ?? []).length);

  return (
    <div
      ref={zoneRef}
      onMouseMove={onMove}
      onMouseLeave={() => setTarget((t) => ({ ...t, active: false }))}
      onTouchStart={onMove}
      onTouchMove={(e) => { onMove(e); }}
      onTouchEnd={() => setTarget((t) => ({ ...t, active: false }))}
      className="absolute inset-0 z-10 overflow-hidden select-none"
      style={{ cursor: target.active ? 'none' : 'default' }}
    >
      {/* Ligne de sol */}
      <div className="absolute inset-x-0" style={{ top: '92%', height: '1px', background: 'linear-gradient(90deg, transparent, oklch(62% 0.24 25 / 0.3), transparent)' }} />

      {/* Double compteur : dernière offre ciblée + total cumulé */}
      <div className="absolute top-5 right-5 z-20 pointer-events-none text-right space-y-2">
        <div>
          <p className="eyebrow">Dernière offre</p>
          <p className="num-tension text-2xl">
            {last !== null ? `+${displayMoney(last, cur)}` : '—'}
          </p>
        </div>
        <div>
          <p className="eyebrow">Total chassé</p>
          <p className="num-loot text-3xl">{displayMoney(saved, cur)}</p>
        </div>
        <p className="eyebrow eyebrow-hot">Visez · Tirez →</p>
      </div>

      {/* Produits qui tombent (tailles variables) */}
      {items.map((it) => (
        <div key={it.id} className="absolute z-10 pointer-events-none"
          style={{ left: `${it.x}%`, top: `${it.y}%`, transform: `translate(-50%,-50%) rotate(${it.rot}deg)` }}>
          <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-lg"
            style={{ width: it.size, height: it.size, background: 'oklch(20% 0.02 264)' }}>
            {it.img ? <Image src={it.img} alt="" fill sizes="96px" className="object-cover" /> : null}
          </div>
        </div>
      ))}

      {/* Produits rates accumules au sol */}
      {landed.map((l, i) => (
        <div key={l.id} className="absolute z-[9] pointer-events-none"
          style={{ left: `${l.x}%`, top: `${92 - (i % 3) * 2}%`, transform: `translate(-50%,-100%) rotate(${l.rot}deg)`, opacity: 0.55 }}>
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 grayscale" style={{ background: 'oklch(18% 0.02 264)' }}>
            {l.img ? <Image src={l.img} alt="" fill sizes="48px" className="object-cover" /> : null}
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
        <div key={c.id} className="absolute z-10 pointer-events-none flex items-center gap-1 num-loot text-sm"
          style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)', opacity: c.life / 55 }}>
          <span>+{displayMoney(c.amount, cur)}</span>
        </div>
      ))}

      {/* Curseur cible */}
      {target.active ? (
        <div className="absolute z-30 pointer-events-none" style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%,-50%)' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" className="hg-scope">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--app-accent)" strokeWidth="1.5" opacity="0.9" />
            <circle cx="32" cy="32" r="18" fill="none" stroke="var(--app-accent)" strokeWidth="1" opacity="0.5" />
            {/* Graduations */}
            <g stroke="var(--app-accent)" strokeWidth="2">
              <line x1="32" y1="2" x2="32" y2="12" />
              <line x1="32" y1="52" x2="32" y2="62" />
              <line x1="2" y1="32" x2="12" y2="32" />
              <line x1="52" y1="32" x2="62" y2="32" />
            </g>
            {/* Croix centrale fine avec écart */}
            <g stroke="var(--app-accent)" strokeWidth="1">
              <line x1="32" y1="24" x2="32" y2="29" />
              <line x1="32" y1="35" x2="32" y2="40" />
              <line x1="24" y1="32" x2="29" y2="32" />
              <line x1="35" y1="32" x2="40" y2="32" />
            </g>
            {/* Point de visée */}
            <circle cx="32" cy="32" r="1.6" fill="var(--app-accent)" />
          </svg>
        </div>
      ) : null}

      {!hasProducts ? (
        <div className="absolute bottom-16 right-6 z-20 text-xs text-app-muted pointer-events-none">
          Ajoutez des produits pour lancer la chasse
        </div>
      ) : null}

      <style>{`
        .hg-scope { filter: drop-shadow(0 0 8px oklch(62% 0.24 25 / 0.7)); animation: hgScope 3s linear infinite; }
        @keyframes hgScope { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .hg-scope { animation: none; } }
        .hg-burst { width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle, oklch(62% 0.24 25 / 0.9), transparent 70%); animation: hgBurst 0.4s ease-out forwards; }
        @keyframes hgBurst { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </div>
  );
}
