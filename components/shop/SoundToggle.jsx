'use client';
import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundOn, setSoundOn, playGavel } from '@/lib/sound/gavel';

// LA CRIÉE — l'opt-in du son de la salle (coupé par défaut).
// Un clic active/coupe ; l'activation joue un coup de marteau en aperçu.
export default function SoundToggle({ className = '' }) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOn(isSoundOn());
    setReady(true);
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundOn(next);
    if (next) playGavel({ force: true }); // aperçu à l'activation
  }

  // Évite le flash d'état incorrect avant hydratation
  const title = on ? 'Son de la salle : activé' : 'Son de la salle : coupé';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={ready ? on : undefined}
      aria-label={title}
      title={title}
      className={`w-9 h-9 grid place-items-center rounded-full transition-colors duration-220 hover:bg-white/5 ${
        on ? 'text-app-loot' : 'text-app-muted'
      } ${className}`}
    >
      {on ? <Volume2 size={17} strokeWidth={2} /> : <VolumeX size={17} strokeWidth={2} />}
    </button>
  );
}
