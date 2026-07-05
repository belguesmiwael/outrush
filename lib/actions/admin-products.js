'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/utils';

const MAX_IMG_BYTES = 6 * 1024 * 1024;
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

/** Upload d'un ou plusieurs fichiers image vers product-media → retourne les paths. */
async function uploadImages(admin, files, slug) {
  const paths = [];
  for (const file of files) {
    if (!file || typeof file === 'string' || file.size === 0) continue;
    if (file.size > MAX_IMG_BYTES || !IMG_TYPES.includes(file.type)) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${slug}/${Date.now()}-${paths.length}.${ext}`;
    const { error } = await admin.storage
      .from('product-media')
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (!error) paths.push(path);
  }
  return paths;
}

const BaseSchema = z.object({
  titleFr: z.string().min(2).max(140),
  titleEn: z.string().min(2).max(140),
  titleAr: z.string().min(1).max(140),
  brand: z.string().max(80).optional().or(z.literal('')),
  descriptionFr: z.string().max(1500).optional().or(z.literal('')),
  descriptionEn: z.string().max(1500).optional().or(z.literal('')),
  descriptionAr: z.string().max(1500).optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  condition: z.enum(['new', 'like_new', 'box_damaged']),
  provenance: z.string().max(160).optional().or(z.literal('')),
  marketPrice: z.coerce.number().positive().max(1000000).optional().or(z.literal('')),
  outletPrice: z.coerce.number().positive().max(1000000),
  currency: z.enum(['USD', 'EUR', 'TND', 'GBP']).default('USD'),
  quantity: z.coerce.number().int().min(0).max(100000),
  publish: z.enum(['on', 'off']).default('on'),
});

function readForm(formData) {
  return {
    titleFr: formData.get('titleFr'),
    titleEn: formData.get('titleEn'),
    titleAr: formData.get('titleAr'),
    brand: formData.get('brand') ?? '',
    descriptionFr: formData.get('descriptionFr') ?? '',
    descriptionEn: formData.get('descriptionEn') ?? '',
    descriptionAr: formData.get('descriptionAr') ?? '',
    categoryId: formData.get('categoryId') ?? '',
    condition: formData.get('condition') ?? 'new',
    provenance: formData.get('provenance') ?? '',
    marketPrice: formData.get('marketPrice') || '',
    outletPrice: formData.get('outletPrice'),
    currency: formData.get('currency') ?? 'USD',
    quantity: formData.get('quantity') ?? '0',
    publish: formData.get('publish') === 'on' ? 'on' : 'off',
  };
}

function buildRow(d, images) {
  const market = d.marketPrice === '' ? null : Number(d.marketPrice);
  return {
    title: { fr: d.titleFr, en: d.titleEn, ar: d.titleAr },
    description:
      d.descriptionFr || d.descriptionEn || d.descriptionAr
        ? { fr: d.descriptionFr, en: d.descriptionEn, ar: d.descriptionAr }
        : null,
    brand: d.brand || null,
    category_id: d.categoryId || null,
    condition: d.condition,
    provenance: d.provenance || null,
    market_price: market,
    market_sources: market
      ? [{ source: 'saisie admin', url: null, price: market, seen_at: new Date().toISOString() }]
      : [],
    outlet_price: d.outletPrice,
    currency: d.currency,
    status: d.publish === 'on' ? 'published' : 'draft',
    ...(images !== undefined ? { images } : {}),
  };
}

/** Créer un produit à la main + stock initial via le ledger. */
export async function createProduct(formData) {
  const user = await requireAdmin();
  const parsed = BaseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, error: 'invalid', details: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const admin = createAdminClient();

  const slug = `${slugify(`${d.brand} ${d.titleFr}`)}-${Date.now().toString(36)}`;
  const files = formData.getAll('images');
  const images = await uploadImages(admin, files, slug);

  const { data: product, error } = await admin
    .from('products')
    .insert({ ...buildRow(d, images), slug, created_by: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'insert_failed' };

  if (d.quantity > 0) {
    await admin.from('inventory_movements').insert({
      product_id: product.id,
      delta: d.quantity,
      reason: 'adjust',
      actor_id: user.id,
    });
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true, id: product.id };
}

const UpdateSchema = BaseSchema.extend({ productId: z.string().uuid() });

/** Éditer un produit. La quantité est ajustée via un mouvement delta (jamais écrite en dur). */
export async function updateProduct(formData) {
  const user = await requireAdmin();
  const parsed = UpdateSchema.safeParse({
    ...readForm(formData),
    productId: formData.get('productId'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: current } = await admin
    .from('products')
    .select('id, slug, quantity, images')
    .eq('id', d.productId)
    .maybeSingle();
  if (!current) return { ok: false, error: 'not_found' };

  // Nouvelles images ajoutées à la galerie existante
  const files = formData.getAll('images');
  const newImages = await uploadImages(admin, files, current.slug);
  const keptImages = formData.getAll('keepImage').map(String);
  const images = [...keptImages, ...newImages];

  const { error } = await admin
    .from('products')
    .update({ ...buildRow(d, images), updated_at: new Date().toISOString() })
    .eq('id', d.productId);
  if (error) return { ok: false, error: 'update_failed' };

  // Ajustement de stock : delta entre cible et réel
  const delta = d.quantity - current.quantity;
  if (delta !== 0) {
    await admin.from('inventory_movements').insert({
      product_id: d.productId,
      delta,
      reason: 'adjust',
      actor_id: user.id,
    });
  }

  revalidatePath('/admin/products');
  revalidatePath(`/product/${current.slug}`);
  revalidatePath('/');
  return { ok: true };
}

const StatusSchema = z.object({
  productId: z.string().uuid(),
  status: z.enum(['published', 'draft', 'archived']),
});

/** Publier / dépublier / archiver rapidement. */
export async function setProductStatus(formData) {
  await requireAdmin();
  const parsed = StatusSchema.safeParse({
    productId: formData.get('productId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const admin = createAdminClient();
  await admin
    .from('products')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.productId);
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true };
}

const DeleteSchema = z.object({ productId: z.string().uuid() });
/**
 * Supprimer un produit. On ARCHIVE par défaut (le ledger et les commandes
 * doivent rester intègres). Suppression dure seulement si aucune vente.
 */
export async function deleteProduct(formData) {
  await requireAdmin();
  const parsed = DeleteSchema.safeParse({ productId: formData.get('productId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const admin = createAdminClient();

  const { count } = await admin
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', parsed.data.productId);

  if (count && count > 0) {
    // Historique de vente → on archive, jamais on ne casse une commande
    await admin.from('products').update({ status: 'archived' }).eq('id', parsed.data.productId);
    revalidatePath('/admin/products');
    revalidatePath('/');
    return { ok: true, archived: true };
  }

  // Pas de vente : purge propre (les liens sont gérés par ON DELETE en base)
  await admin.from('products').delete().eq('id', parsed.data.productId);
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true, archived: false };
}

const StudioSchema = z.object({ productId: z.string().uuid() });

/**
 * Applique le Studio Photo à la 1re image d'un produit : détourage + mise en
 * scène pro sur fond marque. Ajoute le résultat en tête de galerie.
 */
export async function applyPhotoStudio(formData) {
  await requireAdmin();
  const parsed = StudioSchema.safeParse({ productId: formData.get('productId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const { studioProcess } = await import('@/lib/scan/photo-studio');
  const admin = createAdminClient();

  const { data: product } = await admin
    .from('products')
    .select('id, slug, images')
    .eq('id', parsed.data.productId)
    .maybeSingle();
  const first = (product?.images ?? [])[0];
  if (!first) return { ok: false, error: 'no_image' };

  // Télécharge l'image d'origine depuis le bucket public
  const { data: file } = await admin.storage.from('product-media').download(first);
  if (!file) return { ok: false, error: 'download_failed' };
  const buf = Buffer.from(await file.arrayBuffer());

  const studioBuf = await studioProcess(buf, { size: 1200 });
  if (!studioBuf) return { ok: false, error: 'studio_failed' };

  const path = `studio/${product.slug}/${Date.now()}.webp`;
  const { error } = await admin.storage
    .from('product-media')
    .upload(path, studioBuf, { contentType: 'image/webp', upsert: false });
  if (error) return { ok: false, error: 'upload_failed' };

  // Nouveau visuel en tête de galerie
  const images = [path, ...(product.images ?? [])];
  await admin.from('products').update({ images }).eq('id', product.id);

  revalidatePath('/admin/products');
  revalidatePath(`/product/${product.slug}`);
  revalidatePath('/');
  return { ok: true };
}

const GallerySchema = z.object({ productId: z.string().uuid() });

/**
 * Enrichit la galerie d'un produit existant : télécharge les images
 * officielles via son GTIN (Open Facts) et les ajoute en tête.
 */
export async function enrichGallery(formData) {
  await requireAdmin();
  const parsed = GallerySchema.safeParse({ productId: formData.get('productId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const { fetchOfficialImagesFor } = await import('@/lib/scan/enrich-photo');
  const admin = createAdminClient();
  const { data: product } = await admin
    .from('products')
    .select('id, slug, gtin, title, brand, images')
    .eq('id', parsed.data.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: 'not_found' };

  // Cherche par GTIN, et à défaut par nom de produit (marque + titre)
  const name = [product.brand, product.title?.fr].filter(Boolean).join(' ');
  const paths = await fetchOfficialImagesFor(admin, product.gtin, product.slug, name);
  if (!paths.length) return { ok: false, error: 'no_images_found' };

  const existing = Array.isArray(product.images) ? product.images : [];
  const merged = [...paths, ...existing.filter((p) => !paths.includes(p))];
  await admin.from('products').update({ images: merged }).eq('id', product.id);

  revalidatePath('/admin/products');
  revalidatePath(`/product/${product.slug}`);
  revalidatePath('/');
  return { ok: true, added: paths.length };
}

const BulkDeleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

/** Suppression multiple de produits (archive ceux qui ont des ventes). */
export async function deleteProductsBulk(ids) {
  await requireAdmin();
  const parsed = BulkDeleteSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  let deleted = 0, archived = 0;
  const errors = [];
  for (const id of parsed.data.ids) {
    const { count } = await admin
      .from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id);
    if (count && count > 0) {
      // Historique de vente → on archive (ne casse jamais une commande)
      await admin.from('products').update({ status: 'archived' }).eq('id', id);
      archived++;
    } else {
      // Les liens (scans, packs, wishlists…) sont gérés par ON DELETE en base
      const { error } = await admin.from('products').delete().eq('id', id);
      if (error) errors.push(error.message);
      else deleted++;
    }
  }
  revalidatePath('/admin/products');
  revalidatePath('/');
  if (errors.length && deleted === 0 && archived === 0) {
    return { ok: false, error: 'delete_failed', detail: errors[0] };
  }
  return { ok: true, deleted, archived };
}

const StudioPreviewSchema = z.object({
  productId: z.string().uuid(),
  style: z.enum(['velvet', 'spotlight', 'heat']).default('velvet'),
});

/**
 * Génère un APERÇU studio Gemini (met en scène la vraie photo sur fond signature)
 * SANS enregistrer. Retourne l'image en base64 pour prévisualisation + diagnostic.
 */
export async function generateStudioPreview(formData) {
  await requireAdmin();
  const parsed = StudioPreviewSchema.safeParse({
    productId: formData.get('productId'),
    style: formData.get('style') || 'velvet',
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const { geminiStudio, geminiAvailable } = await import('@/lib/scan/gemini-image');
  if (!geminiAvailable()) return { ok: false, error: 'no_key', detail: 'Ajoutez GEMINI_API_KEY dans Vercel.' };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from('products').select('id, slug, title, brand, images').eq('id', parsed.data.productId).maybeSingle();
  const first = (product?.images ?? [])[0];
  if (!first) return { ok: false, error: 'no_image' };

  const { data: file } = await admin.storage.from('product-media').download(first);
  if (!file) return { ok: false, error: 'download_failed' };
  const buf = Buffer.from(await file.arrayBuffer());

  const errRef = { msg: null };
  let dataUrl = null, engine = null, note = null;

  // 1) remove.bg si configuré (fiable, sans quota Gemini) → détourage net + fond signature
  if (process.env.REMOVEBG_API_KEY) {
    const { studioLocal } = await import('@/lib/scan/photo-studio');
    const local = await studioLocal(buf, { size: 1200 });
    if (local) { dataUrl = `data:image/webp;base64,${local.toString('base64')}`; engine = 'removebg'; }
  }

  // 2) Sinon Gemini si dispo (mise en scène complète)
  if (!dataUrl) {
    const out = await geminiStudio(buf, file.type || 'image/jpeg', {
      style: parsed.data.style, brand: product.brand, title: product.title?.fr, errRef,
    });
    if (out) { dataUrl = `data:image/png;base64,${out.toString('base64')}`; engine = 'gemini'; }
  }

  // 3) Dernier recours : fond signature local sans détourage
  if (!dataUrl) {
    const { studioLocal } = await import('@/lib/scan/photo-studio');
    const local = await studioLocal(buf, { size: 1200 });
    if (local) {
      dataUrl = `data:image/webp;base64,${local.toString('base64')}`;
      engine = 'local';
      note = errRef.msg?.includes('Quota')
        ? 'Gemini saturé — fond signature appliqué sans détourage. Configurez remove.bg (gratuit 50/mois) pour un détourage fiable sans quota.'
        : 'Fond signature appliqué sans détourage. Ajoutez REMOVEBG_API_KEY pour détourer.';
    }
  }

  if (!dataUrl) return { ok: false, error: 'studio_failed', detail: errRef.msg };
  return { ok: true, dataUrl, engine, note };
}

const SaveStudioSchema = z.object({
  productId: z.string().uuid(),
  dataUrl: z.string().startsWith('data:image/'),
});

/** Enregistre l'aperçu studio validé en tête de galerie. */
export async function saveStudioImage(formData) {
  await requireAdmin();
  const parsed = SaveStudioSchema.safeParse({
    productId: formData.get('productId'),
    dataUrl: formData.get('dataUrl'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from('products').select('id, slug, images').eq('id', parsed.data.productId).maybeSingle();
  if (!product) return { ok: false, error: 'not_found' };

  const b64 = parsed.data.dataUrl.split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  const path = `studio/${product.slug}/${Date.now()}.png`;
  const { error } = await admin.storage.from('product-media').upload(path, buf, { contentType: 'image/png' });
  if (error) return { ok: false, error: 'upload_failed' };

  const images = [path, ...(product.images ?? [])];
  await admin.from('products').update({ images }).eq('id', product.id);
  revalidatePath('/admin/products');
  revalidatePath(`/product/${product.slug}`);
  revalidatePath('/');
  return { ok: true };
}

const BulkCategorySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  categoryId: z.string().uuid(),
});

/** Assigne une catégorie à plusieurs produits d'un coup. */
export async function classifyProductsBulk(ids, categoryId) {
  await requireAdmin();
  const parsed = BulkCategorySchema.safeParse({ ids, categoryId });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from('products')
    .update({ category_id: parsed.data.categoryId }, { count: 'exact' })
    .in('id', parsed.data.ids);
  if (error) return { ok: false, error: 'update_failed', detail: error.message };

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidatePath('/shop');
  return { ok: true, updated: count ?? parsed.data.ids.length };
}
