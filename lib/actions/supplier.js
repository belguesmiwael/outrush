'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/utils';

const MAX_CSV_BYTES = 512 * 1024; // 512 KB
const MAX_ROWS = 500;

async function requireSupplier() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'supplier') throw new Error('forbidden');
  return { supabase, user };
}

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || !['admin', 'operator'].includes(role)) throw new Error('forbidden');
  return user;
}

/** Parseur CSV robuste (gère guillemets, virgule ou point-virgule). */
function parseCsv(text) {
  const delimiter = text.split('\n')[0]?.includes(';') ? ';' : ',';
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

const RowSchema = z.object({
  title: z.string().min(2).max(140),
  brand: z.string().max(80).optional().or(z.literal('')),
  gtin: z
    .string()
    .regex(/^\d{8,14}$/)
    .optional()
    .or(z.literal('')),
  quantity: z.coerce.number().int().min(1).max(100000),
  asking_price: z.coerce.number().positive().max(100000),
  condition: z.enum(['new', 'like_new', 'box_damaged']).default('new'),
});

const LotSchema = z.object({
  name: z.string().min(2).max(120),
  note: z.string().max(600).optional().or(z.literal('')),
});

/**
 * Dépôt d'un lot fournisseur : CSV (title,brand,gtin,quantity,asking_price,condition)
 * OU une ligne saisie à la main. Tout part en pending_review — le staff publie.
 * Le client authentifié du fournisseur est utilisé : la RLS re-vérifie tout.
 */
export async function depositLot(formData) {
  const { supabase, user } = await requireSupplier();

  const lotParsed = LotSchema.safeParse({
    name: formData.get('lotName'),
    note: formData.get('lotNote') ?? '',
  });
  if (!lotParsed.success) return { ok: false, error: 'lot_invalid' };

  // Lignes : CSV et/ou saisie manuelle
  const rawRows = [];
  const csv = formData.get('csv');
  if (csv && typeof csv !== 'string' && csv.size > 0) {
    if (csv.size > MAX_CSV_BYTES) return { ok: false, error: 'csv_too_big' };
    const text = Buffer.from(await csv.arrayBuffer()).toString('utf8');
    const parsed = parseCsv(text);
    if (!parsed.length) return { ok: false, error: 'csv_empty' };
    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const idx = (name) => header.indexOf(name);
    if (idx('title') === -1 || idx('quantity') === -1 || idx('asking_price') === -1) {
      return { ok: false, error: 'csv_header' };
    }
    for (const cells of parsed.slice(1).slice(0, MAX_ROWS)) {
      rawRows.push({
        title: cells[idx('title')]?.trim() ?? '',
        brand: cells[idx('brand')]?.trim() ?? '',
        gtin: cells[idx('gtin')]?.trim() ?? '',
        quantity: cells[idx('quantity')]?.trim() ?? '',
        asking_price: cells[idx('asking_price')]?.trim() ?? '',
        condition: (cells[idx('condition')]?.trim() || 'new').toLowerCase(),
      });
    }
  }
  const manualTitle = formData.get('title');
  if (manualTitle) {
    rawRows.push({
      title: String(manualTitle),
      brand: String(formData.get('brand') ?? ''),
      gtin: String(formData.get('gtin') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
      asking_price: String(formData.get('askingPrice') ?? ''),
      condition: String(formData.get('condition') ?? 'new'),
    });
  }
  if (!rawRows.length) return { ok: false, error: 'no_rows' };

  const rows = [];
  const rejected = [];
  rawRows.forEach((r, i) => {
    const parsed = RowSchema.safeParse(r);
    if (parsed.success) rows.push(parsed.data);
    else rejected.push(i + 1);
  });
  if (!rows.length) return { ok: false, error: 'all_rows_invalid', rejected };

  // Lot créé via le client du FOURNISSEUR → RLS lots_supplier_insert s'applique
  const { data: lot, error: lotErr } = await supabase
    .from('supplier_lots')
    .insert({ supplier_id: user.id, name: lotParsed.data.name, note: lotParsed.data.note || null })
    .select('id')
    .single();
  if (lotErr) return { ok: false, error: 'lot_insert_failed' };

  // Produits en pending_review, rattachés au lot → RLS supplier_insert_pending s'applique
  const inserts = rows.map((r) => ({
    gtin: r.gtin || null,
    slug: `${slugify(`${r.brand} ${r.title}`)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: { fr: r.title, en: r.title, ar: r.title },
    brand: r.brand || null,
    condition: r.condition,
    outlet_price: r.asking_price,
    market_sources: [],
    status: 'pending_review',
    supplier_id: user.id,
    lot_id: lot.id,
    specs: { supplier_declared_qty: r.quantity, supplier_asking_price: r.asking_price },
  }));

  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 100) {
    const { data, error } = await supabase
      .from('products')
      .insert(inserts.slice(i, i + 100))
      .select('id');
    if (!error) inserted += data?.length ?? 0;
  }
  if (!inserted) return { ok: false, error: 'products_insert_failed' };

  revalidatePath('/supplier');
  return { ok: true, lotId: lot.id, inserted, rejected };
}

const ReviewSchema = z.object({
  productId: z.string().uuid(),
  outletPrice: z.coerce.number().positive().max(100000),
  quantity: z.coerce.number().int().min(1).max(100000),
});

/** Staff : valide un produit fournisseur → publié + stock crédité (ledger). */
export async function approveSupplierProduct(formData) {
  const user = await requireStaff();
  const parsed = ReviewSchema.safeParse({
    productId: formData.get('productId'),
    outletPrice: formData.get('outletPrice'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('products')
    .update({ outlet_price: parsed.data.outletPrice, status: 'published', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.productId)
    .eq('status', 'pending_review')
    .select('id, lot_id')
    .maybeSingle();
  if (error || !updated) return { ok: false, error: 'not_pending' };

  const { error: invErr } = await admin.from('inventory_movements').insert({
    product_id: updated.id,
    delta: parsed.data.quantity,
    reason: 'supplier_in',
    ref_id: updated.lot_id,
    actor_id: user.id,
  });
  if (invErr) return { ok: false, error: 'inventory_failed' };

  if (updated.lot_id) {
    await admin.from('supplier_lots').update({ status: 'live' }).eq('id', updated.lot_id);
  }

  revalidatePath('/ops/scan/queue');
  revalidatePath('/supplier');
  revalidatePath('/');
  return { ok: true };
}

const RejectSchema = z.object({ productId: z.string().uuid() });

/** Staff : écarte un produit fournisseur (archivé, jamais publié). */
export async function rejectSupplierProduct(formData) {
  await requireStaff();
  const parsed = RejectSchema.safeParse({ productId: formData.get('productId') });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  await admin
    .from('products')
    .update({ status: 'archived' })
    .eq('id', parsed.data.productId)
    .eq('status', 'pending_review');
  revalidatePath('/ops/scan/queue');
  return { ok: true };
}
