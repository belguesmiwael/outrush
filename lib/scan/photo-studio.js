import 'server-only';
import sharp from 'sharp';

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
export async function studioProcess(inputBuffer, { size = 1200 } = {}) {
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

    // Fond carbone + halo chaud (SVG)
    const bg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="halo" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#e8442e" stop-opacity="0.20"/>
            <stop offset="55%" stop-color="#e8442e" stop-opacity="0.04"/>
            <stop offset="100%" stop-color="#e8442e" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="vign" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#17171d"/>
        <rect width="100%" height="100%" fill="url(#halo)"/>
        <rect width="100%" height="100%" fill="url(#vign)"/>
      </svg>`
    );

    return await sharp(bg).composite(composites).webp({ quality: 88 }).toBuffer();
  } catch {
    return null;
  }
}

/** Indique si le détourage IA est disponible (clé configurée). */
export function studioAvailable() {
  return Boolean(process.env.REMOVEBG_API_KEY);
}
