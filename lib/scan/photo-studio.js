import 'server-only';
import sharp from 'sharp';
import { geminiStudio, geminiAvailable } from './gemini-image';

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Détourage du fond via un service externe si une clé est fournie.
 * Compatible remove.bg (REMOVEBG_API_KEY). Retourne un PNG transparent ou null.
 * Pluggable : sans clé, on saute le détourage et on garde la photo d'origine.
 */
async function removeBackground(inputBuffer) {
  const key = process.env.REMOVEBG_API_KEY;
  if (!key) return null;
  try {
    const form = new FormData();
    form.append('image_file', new Blob([inputBuffer]), 'image.jpg');
    form.append('size', 'auto');
    const res = await fetchWithTimeout('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key },
      body: form,
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Studio photo OUTRUSH : produit détouré (si possible) posé sur un fond
 * carbone chaud avec halo vermillon + ombre douce — cohérent Noir Sensoriel.
 * Retourne un Buffer WebP prêt à uploader, ou null en cas d'échec.
 */
export async function studioProcess(inputBuffer, { size = 1200, brand, title } = {}) {
  try {
    // Si Gemini dispo : mise en scène complète (produit réel sur fond signature)
    if (geminiAvailable()) {
      const staged = await geminiStudio(inputBuffer, 'image/jpeg', { style: 'velvet', brand, title });
      if (staged) {
        return await sharp(staged).resize(size, size, { fit: 'cover' }).webp({ quality: 88 }).toBuffer();
      }
    }
    return await studioLocal(inputBuffer, { size });
  } catch {
    return null;
  }
}

/**
 * Traitement studio LOCAL (Sharp uniquement, sans IA) : détourage remove.bg si
 * clé dispo, sinon photo brute, posée sur le fond signature OUTRUSH. Indépendant
 * du quota Gemini — toujours disponible.
 */
export async function studioLocal(inputBuffer, { size = 1200 } = {}) {
  try {
    const cutout = await removeBackground(inputBuffer);
    const source = cutout ?? inputBuffer;

    // Le produit, contenu dans un cadre avec marge
    const inner = Math.round(size * 0.78);
    const product = await sharp(source)
      .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(product).metadata();

    // Ombre douce (silhouette floutée sombre) — seulement si détouré
    const composites = [];
    if (cutout) {
      const shadow = await sharp(product)
        .resize(meta.width, meta.height)
        .flatten({ background: '#000000' })
        .blur(18)
        .modulate({ brightness: 0.2 })
        .png()
        .toBuffer();
      composites.push({
        input: shadow,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2) + 24,
        blend: 'multiply',
      });
    }
    composites.push({
      input: product,
      left: Math.round((size - meta.width) / 2),
      top: Math.round((size - meta.height) / 2),
    });

    // Fond signature OUTRUSH — obsidienne chaude + halo de chaleur + reflet laiton
    const bg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="halo" cx="50%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#e8442e" stop-opacity="0.18"/>
            <stop offset="55%" stop-color="#e8442e" stop-opacity="0.035"/>
            <stop offset="100%" stop-color="#e8442e" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="loot" cx="78%" cy="18%" r="45%">
            <stop offset="0%" stop-color="#d9a441" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#d9a441" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="vign" cx="50%" cy="52%" r="72%">
            <stop offset="58%" stop-color="#000000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#161311"/>
        <rect width="100%" height="100%" fill="url(#halo)"/>
        <rect width="100%" height="100%" fill="url(#loot)"/>
        <rect width="100%" height="100%" fill="url(#vign)"/>
      </svg>`
    );

    return await sharp(bg).composite(composites).webp({ quality: 88 }).toBuffer();
  } catch {
    return null;
  }
}

/** Indique si le détourage IA est disponible (Gemini ou remove.bg). */
export function studioAvailable() {
  return geminiAvailable() || Boolean(process.env.REMOVEBG_API_KEY);
}
