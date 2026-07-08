// LA CRIÉE — le son du marteau (opt-in, MUET par défaut).
// Réutilise le même principe WebAudio que le tiroir-caisse du HeroGame :
// coup de bois sec (le marteau qui tombe) + fine cloche laiton (l'adjudication).
// Aucune dépendance, aucune clé, 100% client — respecte prefers-reduced-motion.

let _ctx;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return _ctx;
}

/** Le son de la salle est-il activé par l'utilisateur ? (opt-in, off par défaut) */
export function isSoundOn() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('outrush_sound') === 'on';
  } catch {
    return false;
  }
}

/** Active/coupe le son de la salle. */
export function setSoundOn(on) {
  try {
    window.localStorage.setItem('outrush_sound', on ? 'on' : 'off');
  } catch {
    /* stockage indisponible : on ignore silencieusement */
  }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Joue le coup de marteau. Ne fait rien si le son est coupé (opt-in) ou si
 * l'utilisateur préfère le mouvement réduit. `force` sert au preview du toggle.
 */
export function playGavel({ force = false } = {}) {
  if (!force && !isSoundOn()) return;
  if (prefersReducedMotion()) return;
  const ctx = ac();
  if (!ctx) return;
  // Un geste utilisateur a précédé l'appel : on peut reprendre le contexte.
  if (ctx.state === 'suspended') {
    try { ctx.resume(); } catch { /* noop */ }
  }
  const t0 = ctx.currentTime;

  // 1) COUP DE BOIS : bruit très court, grave, filtré passe-bas (le marteau frappe le pupitre)
  const dur = 0.09;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // décroissance rapide -> "clac" sec
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900; // bois, pas métal
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.55, t0);
  ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  noise.connect(lp).connect(ng).connect(ctx.destination);
  noise.start(t0);

  // 2) FINE CLOCHE LAITON : un ding métallique bref, juste après la frappe (l'adjudication)
  const bellDelay = 0.045;
  const base = 1760; // laiton clair
  [base, base * 2.01, base * 2.98].forEach((freq, k) => {
    const t = t0 + bellDelay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const amp = 0.10 / (k + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.52);
  });
}
