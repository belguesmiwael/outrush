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

  // Pas de vente : purge propre (mouvements de stock d'abord pour la FK)
  await admin.from('inventory_movements').delete().eq('product_id', parsed.data.productId);
  await admin.from('products').delete().eq('id', parsed.data.productId);
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true, archived: false };
}
