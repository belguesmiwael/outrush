'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MobileRelayPanel from '@/components/ops/MobileRelayPanel';

const GTIN_RE = /^\d{8,14}$/;
const COOLDOWN_MS = 2500; // anti double-lecture du même code

export default function ScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const streamRef = useRef(null);
  const lastLockRef = useRef({ code: null, at: 0 });
  const hidRef = useRef(null);

  const [camera, setCamera] = useState('starting'); // starting | live | denied | none
  const [torch, setTorch] = useState({ available: false, on: false });
  const [locked, setLocked] = useState(false);
  const [queue, setQueue] = useState([]); // {code, codeType, status, id?}

  const enqueue = useCallback(async (code, codeType) => {
    const now = Date.now();
    if (lastLockRef.current.code === code && now - lastLockRef.current.at < COOLDOWN_MS) return;
    lastLockRef.current = { code, at: now };

    // Feedback SCAN LOCK : pulse + vibration + bip
    setLocked(true);
    setTimeout(() => setLocked(false), 600);
    if (navigator.vibrate) navigator.vibrate(60);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = 1180;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      /* audio non bloquant */
    }

    const localId = `${code}-${now}`;
    setQueue((q) => [{ localId, code, codeType, status: 'queued' }, ...q].slice(0, 40));

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_type: codeType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'scan_failed');
      setQueue((q) =>
        q.map((item) =>
          item.localId === localId ? { ...item, status: json.status ?? 'enriching', id: json.id } : item
        )
      );
    } catch {
      setQueue((q) => q.map((item) => (item.localId === localId ? { ...item, status: 'error' } : item)));
    }
  }, []);

  // ── Caméra + boucle de décodage via Web Worker ──
  useEffect(() => {
    let raf;
    let cancelled = false;
    const worker = new Worker(new URL('@/lib/scan/decode-worker.js', import.meta.url));
    workerRef.current = worker;
    let busy = false;

    worker.onmessage = (e) => {
      busy = false;
      if (e.data?.ok) {
        const { code, codeType } = e.data;
        if (codeType === 'qr' || GTIN_RE.test(code)) enqueue(code, codeType);
      }
    };

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setCamera('live');

        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() ?? {};
        if (caps.torch) setTorch({ available: true, on: false });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const loop = () => {
          if (cancelled) return;
          if (!busy && video.readyState >= 2) {
            const w = 640;
            const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            busy = true;
            worker.postMessage({ data: img.data, width: w, height: h }, [img.data.buffer]);
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        setCamera(err?.name === 'NotAllowedError' ? 'denied' : 'none');
      }
    }
    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      worker.terminate();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enqueue]);

  // ── Mode douchette : input caché toujours focus ──
  useEffect(() => {
    const el = hidRef.current;
    if (!el) return;
    const keepFocus = () => el.focus();
    el.focus();
    document.addEventListener('click', keepFocus);
    return () => document.removeEventListener('click', keepFocus);
  }, []);

  function onHidKeyDown(e) {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      if (GTIN_RE.test(value)) {
        enqueue(value, value.length === 12 ? 'upca' : 'ean13');
      }
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setTorch((t) => ({ ...t, on }));
    } catch {
      setTorch((t) => ({ ...t, available: false }));
    }
  }

  const STATUS_UI = {
    queued: { label: 'En file', cls: 'text-app-muted' },
    enriching: { label: 'Enquête en cours…', cls: 'text-app-accent' },
    ready: { label: 'Prêt ✓', cls: '' },
    duplicate: { label: 'Doublon → incrément', cls: '' },
    not_found: { label: 'Introuvable', cls: '' },
    error: { label: 'Erreur réseau', cls: '' },
  };

  return (
    <main className="relative min-h-dvh flex flex-col">
      {/* Douchette HID */}
      <input
        ref={hidRef}
        onKeyDown={onHidKeyDown}
        aria-label="Douchette code-barres"
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        autoComplete="off"
      />

      {/* Viseur */}
      <div className="relative flex-1 bg-black min-h-[55dvh] overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Cadre cible */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div
            className={`w-[70%] max-w-md aspect-[3/2] rounded-2xl border-2 transition-colors duration-120 ${
              locked ? 'scan-lock border-app-accent' : 'border-white/40'
            }`}
            style={{
              boxShadow: locked ? undefined : '0 0 0 9999px oklch(0% 0 0 / 0.45)',
            }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.35em] uppercase bg-black/60 px-3 py-1 rounded-full text-white/80">
              {locked ? 'LOCK' : 'Visez le code-barres'}
            </span>
          </div>
        </div>

        {camera !== 'live' ? (
          <div className="absolute inset-0 grid place-items-center bg-app-bg/90 p-8 text-center">
            {camera === 'starting' ? (
              <div className="skeleton w-64 h-40 rounded-2xl" />
            ) : (
              <div className="space-y-3 max-w-sm">
                <p className="font-display font-bold text-xl">
                  {camera === 'denied' ? 'Caméra refusée' : 'Caméra indisponible'}
                </p>
                <p className="text-app-muted text-sm">
                  Le mode douchette reste actif : branchez votre douchette USB/Bluetooth et scannez, les codes
                  arrivent directement dans la file.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {torch.available ? (
          <button
            onClick={toggleTorch}
            className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-medium bg-black/60 backdrop-blur border border-white/20 transition-transform duration-120 active:scale-95"
          >
            {torch.on ? '🔦 Torche ON' : '🔦 Torche'}
          </button>
        ) : null}
      </div>

      {/* File de rafale */}
      <section className="border-t border-white/5 p-4 md:p-6 space-y-3" style={{ background: 'oklch(14% 0.015 260)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">File de rafale</h2>
          <Link href="/ops/scan/queue" className="text-sm text-app-accent hover:underline">
            Valider les fiches →
          </Link>
        </div>

        {/* Relais téléphone → PC */}
        <MobileRelayPanel onRemoteScan={enqueue} />
        {queue.length === 0 ? (
          <p className="text-app-muted text-sm">Aucun scan — le viseur attend sa première cible.</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {queue.map((item) => {
              const ui = STATUS_UI[item.status] ?? STATUS_UI.queued;
              return (
                <li
                  key={item.localId}
                  className="card-hunt rise-in px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-mono tabular-nums">{item.code}</span>
                  <span
                    className={ui.cls}
                    style={
                      item.status === 'ready'
                        ? { color: 'var(--app-success)' }
                        : item.status === 'error' || item.status === 'not_found'
                          ? { color: 'var(--app-danger)' }
                          : undefined
                    }
                  >
                    {ui.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
