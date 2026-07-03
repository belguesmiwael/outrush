'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const GTIN_RE = /^\d{8,14}$/;
const COOLDOWN_MS = 2500;

/**
 * Gère caméra + Web Worker de décodage + feedback SCAN LOCK.
 * `onCode(code, codeType)` est appelé à chaque lecture valide (dé-dupliquée).
 * Réutilisé par le scanner PC et le scanner mobile.
 */
export function useBarcodeScanner(onCode) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastLockRef = useRef({ code: null, at: 0 });

  const [camera, setCamera] = useState('starting'); // starting | live | denied | none
  const [torch, setTorch] = useState({ available: false, on: false });
  const [locked, setLocked] = useState(false);

  const handleCode = useCallback(
    (code, codeType) => {
      const now = Date.now();
      if (lastLockRef.current.code === code && now - lastLockRef.current.at < COOLDOWN_MS) return;
      lastLockRef.current = { code, at: now };

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
      onCode(code, codeType);
    },
    [onCode]
  );

  useEffect(() => {
    let raf;
    let cancelled = false;
    const worker = new Worker(new URL('@/lib/scan/decode-worker.js', import.meta.url));
    let busy = false;

    worker.onmessage = (e) => {
      busy = false;
      if (e.data?.ok) {
        const { code, codeType } = e.data;
        if (codeType === 'qr' || GTIN_RE.test(code)) handleCode(code, codeType);
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
  }, [handleCode]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setTorch((t) => ({ ...t, on }));
    } catch {
      setTorch((t) => ({ ...t, available: false }));
    }
  }, [torch.on]);

  return { videoRef, canvasRef, camera, torch, locked, toggleTorch };
}
