import 'server-only';

const TIMEOUT_MS = 30000;

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
 * Détourage produit via Gemini (modèle image) : renvoie un PNG à fond transparent,
 * ou null si indisponible/échec. On demande au modèle d'isoler le produit sur fond
 * transparent — le produit reste RÉEL, seul le fond est retiré.
 */
export async function geminiCutout(inputBuffer, mimeType = 'image/jpeg') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const model = 'gemini-2.0-flash-exp-image-generation';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Isole précisément ce produit et retire complètement l\'arrière-plan. Rends UNIQUEMENT le produit sur un fond parfaitement transparent, sans ombre, sans texte ajouté, sans modifier le produit lui-même. Conserve tous les détails et couleurs réels du produit.' },
            { inline_data: { mime_type: mimeType, data: inputBuffer.toString('base64') } },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inline_data?.data || p.inlineData?.data);
    const b64 = imgPart?.inline_data?.data ?? imgPart?.inlineData?.data;
    if (!b64) return null;
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}
