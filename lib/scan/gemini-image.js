import 'server-only';

const TIMEOUT_MS = 45000;
const MODEL = 'gemini-2.5-flash-image'; // "Nano Banana" — édition d'image stable

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Vrai si une clé Gemini est configurée. */
export function geminiAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Met en scène la VRAIE photo du produit sur un fond signature OUTRUSH via Gemini
 * (Nano Banana). Le produit reste identique ; seul l'arrière-plan devient premium.
 * `brandInfo` : {title, brand} pour aider le modèle. `style` : variante de fond.
 * Retourne un Buffer PNG (l'image mise en scène) ou null si indisponible/échec.
 * `errRef` (optionnel) : objet {msg} rempli avec la cause d'échec pour diagnostic.
 */
export async function geminiStudio(inputBuffer, mimeType = 'image/jpeg', opts = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { if (opts.errRef) opts.errRef.msg = 'GEMINI_API_KEY absente'; return null; }

  const styles = {
    velvet: 'un fond studio sombre haut de gamme : obsidienne chaude presque noire (#161311) avec un halo de lumière vermillon doux (#e8442e) diffus derrière le produit et un léger reflet laiton doré. Ambiance velours nocturne, éclairage cinématographique, ombre portée douce et réaliste sous le produit.',
    spotlight: 'un fond studio noir profond avec un unique projecteur chaud centré sur le produit, forte profondeur, ombre nette, style photographie de packshot luxe.',
    heat: 'un fond dégradé sombre avec des vagues de chaleur vermillon subtiles montant du bas, ambiance énergique et premium, réflexion douce du produit sur une surface sombre.',
  };
  const bg = styles[opts.style] || styles.velvet;
  const label = [opts.brand, opts.title].filter(Boolean).join(' ');

  const prompt =
    `Tu es un photographe packshot de luxe. Voici la photo réelle d'un produit${label ? ` (${label})` : ''}. ` +
    `Détoure PARFAITEMENT le produit de son arrière-plan actuel et REPOSE-LE, sans le modifier, ` +
    `au centre d'un nouveau décor : ${bg} ` +
    `RÈGLES ABSOLUES : ne change RIEN au produit lui-même (forme, couleurs, texte, étiquette, proportions restent identiques au réel). ` +
    `N'ajoute aucun texte, logo, ni élément inventé. Rends une image carrée nette, prête pour une fiche e-commerce premium.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: inputBuffer.toString('base64') } },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (opts.errRef) opts.errRef.msg = `gemini_${res.status}: ${body.slice(0, 160)}`;
      return null;
    }
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inline_data?.data || p.inlineData?.data);
    const b64 = imgPart?.inline_data?.data ?? imgPart?.inlineData?.data;
    if (!b64) {
      if (opts.errRef) opts.errRef.msg = 'gemini: pas d\'image dans la réponse';
      return null;
    }
    return Buffer.from(b64, 'base64');
  } catch (e) {
    if (opts.errRef) opts.errRef.msg = `gemini_threw: ${e?.message?.slice(0, 120)}`;
    return null;
  }
}
