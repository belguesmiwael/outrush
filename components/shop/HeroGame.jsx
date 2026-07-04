'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sparkles, Shirt, Cpu, Headphones, Watch, Gem, Gamepad2, Home,
  Footprints, ShoppingBasket, Smartphone, Lamp,
} from 'lucide-react';

const ICONS = [Sparkles, Shirt, Cpu, Headphones, Watch, Gem, Gamepad2, Home, Footprints, ShoppingBasket, Smartphone, Lamp];

let idc = 0;

/**
 * Zone de jeu du hero : des icônes produits s'écoulent du haut. Le curseur
 * devient une cible ; la survoler explose l'icône, fait tomber une pièce
 * (économie), avec son de tir + son de pièce. Purement décoratif et fun.
 */
export default function HeroGame() {
  const zoneRef = useRef(null);
  const [items, setItems] = useState([]); // icônes qui tombent
  const [coins, setCoins] = useState([]); // pièces qui tombent
  const [bursts, setBursts] = useState([]); // explosions
  const [saved, setSaved] = useState(0);
  const [target, setTarget] = useState({ x: -100, y: -100, active: false });
  const audioRef = useRef(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  function ac() {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return audioRef.current;
  }

  // Son de tir : bruit blanc court à décroissance rapide
  const shotSound = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const dur = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1800;
    src.connect(flt).connect(g).connect(ctx.destination); src.start();
  }, []);

  // Son de pièce : deux tons rapides ascendants
  const coinSound = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    [988, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.13);
    });
  }, []);

  // Génère une icône qui tombe régulièrement
  useEffect(() => {
    if (reduced.current) return;
    const spawn = setInterval(() => {
      setItems((prev) => {
        if (prev.length > 7) return prev;
        const Icon = ICONS[Math.floor(Math.random() * ICONS.length)];
        return [...prev, {
          id: ++idc, Icon,
          x: 10 + Math.random() * 80, // % horizontal
          y: -8,
          speed: 0.18 + Math.random() * 0.22,
          rot: Math.random() * 360,
        }];
      });
    }, 900);
    return () => clearInterval(spawn);
  }, []);

  // Boucle d'animation
  useEffect(() => {
    if (reduced.current) return;
    let raf;
    const tick = () => {
      setItems((prev) => prev.map((it) => ({ ...it, y: it.y + it.speed })).filter((it) => it.y < 110));
      setCoins((prev) => prev.map((c) => ({ ...c, y: c.y + c.vy, vy: c.vy + 0.03, life: c.life - 1 })).filter((c) => c.life > 0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hit = useCallback((item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setBursts((prev) => [...prev, { id: ++idc, x: item.x, y: item.y }]);
    setCoins((prev) => [...prev, { id: ++idc, x: item.x, y: item.y, vy: 0.3, life: 60 }]);
    setSaved((s) => s + (Math.floor(Math.random() * 40) + 5));
    shotSound(); coinSound();
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== item.id)), 400);
  }, [shotSound, coinSound]);

  function onMove(e) {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTarget({ x, y, active: true });
    // Collision : cible proche d'une icône
    setItems((prev) => {
      const remaining = [];
      let hitItem = null;
      for (const it of prev) {
        const dx = it.x - x, dy = it.y - y;
        if (!hitItem && Math.hypot(dx, dy) < 7) hitItem = it;
        else remaining.push(it);
      }
      if (hitItem) {
        setBursts((b) => [...b, { id: ++idc, x: hitItem.x, y: hitItem.y }]);
        setCoins((c) => [...c, { id: ++idc, x: hitItem.x, y: hitItem.y, vy: 0.3, life: 60 }]);
        setSaved((s) => s + (Math.floor(Math.random() * 40) + 5));
        shotSound(); coinSound();
        setTimeout(() => setBursts((bb) => bb.filter((b) => b.id !== hitItem.id)), 400);
        return remaining;
      }
      return prev;
    });
  }

  return (
    <div
      ref={zoneRef}
      onMouseMove={onMove}
      onMouseLeave={() => setTarget((t) => ({ ...t, active: false }))}
      className="relative w-full h-[440px] rounded-3xl overflow-hidden select-none"
      style={{ cursor: 'none', background: 'radial-gradient(ellipse at 50% 30%, oklch(20% 0.02 264), oklch(15% 0.014 264))', border: '1px solid oklch(100% 0 0 / 0.06)' }}
    >
      {/* Compteur d'économies */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-app-muted">Économies chassées</p>
        <p className="font-display font-extrabold text-3xl text-app-success tabular-nums">{saved}$</p>
      </div>
      <div className="absolute top-4 right-4 z-20 pointer-events-none text-right">
        <p className="text-[10px] uppercase tracking-[0.25em] text-app-accent">Visez · Tirez</p>
        <p className="text-xs text-app-muted">chassez les bonnes affaires</p>
      </div>

      {/* Icônes qui tombent */}
      {items.map((it) => {
        const Icon = it.Icon;
        return (
          <div
            key={it.id}
            onMouseEnter={() => hit(it)}
            className="absolute z-10"
            style={{ left: `${it.x}%`, top: `${it.y}%`, transform: `translate(-50%,-50%) rotate(${it.rot}deg)` }}
          >
            <div className="w-11 h-11 grid place-items-center rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <Icon className="w-5 h-5 text-white/80" strokeWidth={1.75} />
            </div>
          </div>
        );
      })}

      {/* Explosions */}
      {bursts.map((b) => (
        <div key={b.id} className="absolute z-10 pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className="burst" />
        </div>
      ))}

      {/* Pièces qui tombent */}
      {coins.map((c) => (
        <div key={c.id} className="absolute z-10 pointer-events-none font-display font-extrabold text-app-success" style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)', opacity: c.life / 60 }}>
          💰
        </div>
      ))}

      {/* Curseur cible */}
      {target.active ? (
        <div className="absolute z-30 pointer-events-none" style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className="crosshair" />
        </div>
      ) : null}

      {/* Repli mobile / reduced-motion : simple message */}
      <div className="absolute inset-x-0 bottom-4 text-center text-xs text-app-muted pointer-events-none md:hidden">
        Passez sur les icônes pour chasser les économies
      </div>

      <style>{`
        .crosshair { width: 46px; height: 46px; border: 2px solid var(--app-accent); border-radius: 50%; position: relative; box-shadow: 0 0 20px oklch(62% 0.24 25 / 0.6); }
        .crosshair::before, .crosshair::after { content: ''; position: absolute; background: var(--app-accent); }
        .crosshair::before { width: 2px; height: 14px; left: 50%; top: -8px; transform: translateX(-50%); }
        .crosshair::after { width: 14px; height: 2px; top: 50%; left: -8px; transform: translateY(-50%); }
        .burst { width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle, oklch(62% 0.24 25 / 0.9), transparent 70%); animation: burstAnim 0.4s ease-out forwards; }
        @keyframes burstAnim { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>
    </div>
  );
}
