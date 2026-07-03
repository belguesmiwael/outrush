'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBarcodeScanner } from '@/lib/scan/useBarcodeScanner';
import { pairScanSession } from '@/lib/actions/scan-session';

export default function MobileScanner({ token }) {
  const channelRef = useRef(null);
  const [status, setStatus] = useState('pairing'); // pairing | live | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [sent, setSent] = useState([]); // codes diffusés (feedback local)

  // Appairage + ouverture du canal Realtime
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

  const onCode = useCallback((code, codeType) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: 'scan', payload: { code, codeType } });
    setSent((prev) => [{ code, at: Date.now() }, ...prev].slice(0, 8));
  }, []);

  const { videoRef, canvasRef, camera, torch, locked, toggleTorch } = useBarcodeScanner(onCode);

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

  return (
    <main className="relative min-h-dvh flex flex-col bg-black">
      {/* Viseur plein écran */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div
            className={`w-[75%] max-w-sm aspect-[3/2] rounded-2xl border-2 transition-colors duration-120 ${
              locked ? 'scan-lock border-app-accent' : 'border-white/40'
            }`}
            style={{ boxShadow: locked ? undefined : '0 0 0 9999px oklch(0% 0 0 / 0.45)' }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.35em] uppercase bg-black/60 px-3 py-1 rounded-full text-white/80">
              {locked ? 'Verrouillé' : 'Visez le code-barres'}
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
            <button
              onClick={toggleTorch}
              className="bg-black/60 rounded-full px-4 py-1.5 text-xs text-white/90"
            >
              {torch.on ? '🔦 Éteindre' : '🔦 Torche'}
            </button>
          ) : null}
        </div>

        {camera === 'denied' ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
            <p className="text-white/80 text-sm">
              Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur.
            </p>
          </div>
        ) : null}
      </div>

      {/* Derniers scans envoyés */}
      <div className="bg-app-bg p-4 space-y-2 max-h-[30dvh] overflow-y-auto">
        <p className="text-xs uppercase tracking-widest text-app-muted">
          Envoyés au PC ({sent.length})
        </p>
        {sent.length === 0 ? (
          <p className="text-app-muted text-sm">Scannez un code-barres pour commencer.</p>
        ) : (
          sent.map((s) => (
            <div key={s.at} className="flex items-center justify-between text-sm rise-in">
              <span className="font-mono">{s.code}</span>
              <span className="text-app-success text-xs">✓ envoyé</span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
