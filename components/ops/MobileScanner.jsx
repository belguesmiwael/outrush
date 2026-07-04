'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBarcodeScanner } from '@/lib/scan/useBarcodeScanner';
import { pairScanSession } from '@/lib/actions/scan-session';

export default function MobileScanner({ token }) {
  const channelRef = useRef(null);
  const sentCodesRef = useRef(new Set()); // dédup permanente des codes envoyés
  const [status, setStatus] = useState('pairing'); // pairing | live | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [sent, setSent] = useState([]);
  const [snapshot, setSnapshot] = useState(null); // {dataUrl, blob} en attente de confirmation
  const [sending, setSending] = useState(false);

  // Appairage + canal Realtime
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await pairScanSession(token);
      if (!active) return;
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(
          res.error === 'expired'
            ? 'Session expirée — régénérez le QR sur le PC.'
            : res.error === 'forbidden'
              ? 'Cette session appartient à un autre compte.'
              : res.error === 'not_found'
                ? 'Session introuvable.'
                : 'Connexion impossible.'
        );
        return;
      }
      const supabase = createClient();
      const channel = supabase.channel(`scan-relay:${token}`, {
        config: { broadcast: { self: false } },
      });
      channel.subscribe((s) => {
        if (s === 'SUBSCRIBED' && active) {
          channel.send({ type: 'broadcast', event: 'paired', payload: {} });
          setStatus('live');
        }
      });
      channelRef.current = channel;
    })();
    return () => {
      active = false;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [token]);

  // Code-barres/QR détecté en continu → broadcast au PC (dédup permanente)
  const onCode = useCallback(
    (code, codeType) => {
      const ch = channelRef.current;
      if (!ch) return;
      if (sentCodesRef.current.has(code)) return;
      sentCodesRef.current.add(code);
      ch.send({ type: 'broadcast', event: 'scan', payload: { code, codeType } });
      setSent((prev) => [{ label: code, at: Date.now(), kind: 'code' }, ...prev].slice(0, 8));
    },
    []
  );

  const { videoRef, canvasRef, camera, torch, locked, toggleTorch } = useBarcodeScanner(onCode);

  // Capture une image de la vidéo en direct → écran de confirmation
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSnapshot({ dataUrl: URL.createObjectURL(blob), blob });
          if (navigator.vibrate) navigator.vibrate(40);
        }
      },
      'image/jpeg',
      0.85
    );
  }

  // Envoi de la photo confirmée → l'IA identifie + cherche sur le web
  async function sendPhoto() {
    if (!snapshot?.blob) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.set('photo', snapshot.blob, 'capture.jpg');
      const res = await fetch('/api/scan-photo', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'photo_failed');
      // Prévient le PC qu'une fiche photo arrive dans la file de validation
      channelRef.current?.send({
        type: 'broadcast',
        event: 'photo',
        payload: { scanId: json.id, status: json.status },
      });
      setSent((prev) => [{ label: '📷 Produit photographié', at: Date.now(), kind: 'photo' }, ...prev].slice(0, 8));
      setSnapshot(null);
    } catch {
      setSent((prev) => [{ label: '📷 Échec envoi', at: Date.now(), kind: 'error' }, ...prev].slice(0, 8));
    } finally {
      setSending(false);
    }
  }

  if (status === 'error') {
    return (
      <main className="min-h-dvh grid place-items-center p-6 text-center">
        <div className="card-hunt p-8 space-y-3 max-w-sm">
          <div className="text-4xl">⏱</div>
          <p className="font-display font-bold text-lg">Connexion impossible</p>
          <p className="text-app-muted text-sm">{errorMsg}</p>
        </div>
      </main>
    );
  }

  // ── Écran de confirmation photo ──
  if (snapshot) {
    return (
      <main className="min-h-dvh flex flex-col bg-black">
        <div className="flex-1 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={snapshot.dataUrl} alt="Aperçu" className="absolute inset-0 w-full h-full object-contain" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-4 py-1.5">
            <span className="text-xs text-white/90 font-medium">Cette photo est-elle nette ?</span>
          </div>
        </div>
        <div className="bg-app-bg p-4 flex gap-3 safe-bottom">
          <button
            onClick={() => setSnapshot(null)}
            disabled={sending}
            className="flex-1 rounded-xl py-4 font-display font-bold border border-white/15 text-white disabled:opacity-50 transition-transform duration-120 active:scale-95"
          >
            ↺ Refaire
          </button>
          <button
            onClick={sendPhoto}
            disabled={sending}
            className="flex-[2] rounded-xl py-4 font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 active:scale-95"
          >
            {sending ? 'Envoi à l’IA…' : '✓ Envoyer — l’IA crée la fiche'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Cadre cible unique — détecte les codes en continu */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div
            className={`w-[80%] max-w-sm aspect-square rounded-2xl border-2 transition-all duration-220 ${
              locked ? 'scan-lock border-app-accent' : 'border-white/40'
            }`}
            style={{ boxShadow: '0 0 0 9999px oklch(0% 0 0 / 0.45)' }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.35em] uppercase bg-black/60 px-3 py-1 rounded-full text-white/80 whitespace-nowrap">
              {locked ? '✓ Code détecté' : 'Code-barres auto · ou photo'}
            </span>
          </div>
        </div>

        {/* Bandeau statut */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              {status === 'live' ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-app-success" />
              ) : (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
              )}
            </span>
            <span className="text-xs text-white/90 font-medium">
              {status === 'live' ? 'Relié au PC' : 'Connexion…'}
            </span>
          </div>
          {torch.available ? (
            <button onClick={toggleTorch} className="bg-black/60 rounded-full px-4 py-1.5 text-xs text-white/90">
              {torch.on ? '🔦 Éteindre' : '🔦 Torche'}
            </button>
          ) : null}
        </div>

        {/* Bouton photo TOUJOURS visible (produits sans code-barres) */}
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2">
          <button
            onClick={capturePhoto}
            disabled={camera !== 'live'}
            className="rounded-full bg-white/95 ring-4 ring-white/30 disabled:opacity-40 transition-transform duration-120 active:scale-90 grid place-items-center"
            style={{ width: 72, height: 72 }}
            aria-label="Prendre la photo du produit"
          >
            <span className="rounded-full bg-app-accent" style={{ width: 56, height: 56 }} />
          </button>
          <span className="text-[11px] text-white/70 bg-black/50 px-3 py-1 rounded-full">
            📷 Photo produit (sans code-barres)
          </span>
        </div>

        {camera === 'denied' ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
            <p className="text-white/80 text-sm">
              Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur.
            </p>
          </div>
        ) : null}
      </div>

      {/* Historique local */}
      <div className="bg-app-bg p-4 space-y-2 max-h-[22dvh] overflow-y-auto">
        <p className="text-xs uppercase tracking-widest text-app-muted">Envoyés au PC ({sent.length})</p>
        {sent.length === 0 ? (
          <p className="text-app-muted text-sm">
            Scannez un code-barres, ou photographiez un produit sans code.
          </p>
        ) : (
          sent.map((s) => (
            <div key={s.at} className="flex items-center justify-between text-sm rise-in">
              <span className={s.kind === 'code' ? 'font-mono' : ''}>{s.label}</span>
              <span className={`text-xs ${s.kind === 'error' ? 'text-app-accent' : 'text-app-success'}`}>
                {s.kind === 'error' ? '✕' : '✓ envoyé'}
              </span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
