'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { createScanSession } from '@/lib/actions/scan-session';

/**
 * Panneau de relais téléphone → PC.
 * 1) crée une session, affiche un QR vers /ops/scan/mobile/[token]
 * 2) s'abonne au canal Realtime de la session
 * 3) chaque code poussé par le téléphone est remonté via onRemoteScan()
 */
export default function MobileRelayPanel({ onRemoteScan, onRemotePhoto }) {
  const [state, setState] = useState('idle'); // idle | loading | ready | paired | error
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [mobileUrl, setMobileUrl] = useState(null);
  const channelRef = useRef(null);

  async function startSession() {
    setState('loading');
    const res = await createScanSession();
    if (!res.ok) {
      setState('error');
      return;
    }
    const url = `${window.location.origin}/ops/scan/mobile/${res.token}`;
    setMobileUrl(url);
    try {
      setQrDataUrl(
        await QRCode.toDataURL(url, {
          width: 240,
          margin: 1,
          color: { dark: '#f4f4f6', light: '#00000000' },
        })
      );
    } catch {
      /* le lien reste cliquable même sans image QR */
    }
    setState('ready');

    // Canal Realtime partagé PC ↔ téléphone (broadcast, pas de table)
    const supabase = createClient();
    const channel = supabase.channel(`scan-relay:${res.token}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'scan' }, ({ payload }) => {
        if (payload?.code && payload?.codeType) {
          onRemoteScan(payload.code, payload.codeType);
        }
      })
      .on('broadcast', { event: 'photo' }, ({ payload }) => {
        // Une fiche photo a été envoyée depuis le téléphone (déjà créée côté serveur)
        if (payload?.scanId && onRemotePhoto) onRemotePhoto(payload.scanId);
      })
      .on('broadcast', { event: 'paired' }, () => setState('paired'))
      .subscribe();
    channelRef.current = channel;
  }

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  if (state === 'idle') {
    return (
      <button
        onClick={startSession}
        className="w-full rounded-xl py-3 font-display font-bold border border-white/10 hover:border-app-accent hover:text-app-accent transition-colors duration-120"
      >
        📱 Scanner avec mon téléphone
      </button>
    );
  }

  return (
    <div className="card-hunt p-5 space-y-4 text-center">
      {state === 'loading' ? (
        <p className="text-app-muted text-sm py-8">Création de la session…</p>
      ) : state === 'error' ? (
        <p className="text-app-accent text-sm py-8">Impossible de créer la session. Réessayez.</p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2">
            <span className={`relative flex h-2.5 w-2.5`}>
              {state === 'paired' ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-success" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-accent" />
                </>
              )}
            </span>
            <p className="font-display font-bold text-sm">
              {state === 'paired' ? 'Téléphone connecté — scannez !' : 'En attente du téléphone…'}
            </p>
          </div>

          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR de connexion" className="mx-auto rounded-lg" width={200} height={200} />
          ) : null}

          <p className="text-xs text-app-muted">
            Flashez ce QR avec l'appareil photo de votre téléphone.<br />
            Chaque code scanné apparaîtra ici en direct.
          </p>

          {mobileUrl ? (
            <p className="text-[10px] text-app-muted break-all font-mono opacity-60">{mobileUrl}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
