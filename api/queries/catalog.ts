import { getDb } from "./connection";
import {
  collections,
  garmentColors,
  garmentStyles,
  products,
  productColorImages,
  type Product,
} from "@db/schema";
import { and, asc, desc, eq, ne } from "drizzle-orm";

// The storefront UI (ported from the original design) expects Base44-shaped
// records: snake_case fields, prices in USD dollars, string ids. These
// mappers centralize that conversion.

export function toUiProduct(p: Product) {
  return {
    id: String(p.id),
    name_en: p.nameEn,
    name_ar: p.nameAr,
    phrase_ar: p.phraseAr,
    phrase_en: p.phraseEn,
    payoff_en: p.payoffEn,
    description_en: p.descriptionEn,
    description_ar: p.descriptionAr,
    collection_name: p.collectionName,
    mood: p.mood,
    product_type: p.productType,
    garment_style: p.garmentStyle,
    fit_en: p.fitEn,
    care_en: p.careEn,
    care_ar: p.careAr,
    measurements_en: p.measurementsEn,
    approved_colors: p.approvedColors,
    sizes: p.sizes,
    placement: p.placement,
    price: p.priceCents / 100,
    compare_at_price: p.compareAtPriceCents != null ? p.compareAtPriceCents / 100 : null,
    images: p.images,
    print_file_url: p.printFileUrl,
    status: p.status,
    preorder_type: p.preorderType,
    preorder_close_date: p.preorderCloseDate,
    preorder_capacity: p.preorderCapacity,
    units_sold: p.unitsSold,
    estimated_production_days: p.estimatedProductionDays,
    estimated_dispatch_window: p.estimatedDispatchWindow,
    drop_name: p.dropName,
    sort_order: p.sortOrder,
    created_date: p.createdAt.toISOString(),
  };
}

/**
 * Public storefront serializer (audit M4). The full `toUiProduct` carries
 * ops/factory-only fields that must never reach anonymous shoppers:
 * `print_file_url` (factory artwork), `units_sold`, and `preorder_capacity`
 * (internal sales/stock numbers). The product page only needs to know
 * whether a limited run is sold out, so that's exposed as a boolean.
 * Staff/admin endpoints keep using the full `toUiProduct` above.
 */
export function toUiPublicProduct(p: Product) {
  const { print_file_url: _artwork, units_sold: _sold, preorder_capacity: _capacity, ...publicFields } = toUiProduct(p);
  return {
    ...publicFields,
    is_sold_out:
      p.preorderType === "limited_quantity" &&
      p.preorderCapacity != null &&
      p.unitsSold >= p.preorderCapacity,
  };
}

export async function listCollections() {
  const rows = await getDb().select().from(collections).orderBy(asc(collections.sortOrder));
  return rows.map((c) => ({
    id: String(c.id),
    name_en: c.nameEn,
    name_ar: c.nameAr,
    slug: c.slug,
    description_en: c.descriptionEn,
    description_ar: c.descriptionAr,
    accent: c.accent,
    cover_image: c.coverImage,
    sort_order: c.sortOrder,
  }));
}

function toUiColor(c: typeof garmentColors.$inferSelect) {
  return {
    id: String(c.id),
    name_en: c.nameEn,
    name_ar: c.nameAr,
    hex: c.hex,
    sort_order: c.sortOrder,
  };
}

export async function listGarmentColors() {
  const rows = await getDb().select().from(garmentColors).orderBy(asc(garmentColors.sortOrder));
  return rows.map(toUiColor);
}

/** Admin CRUD for the garment color catalog — the master list of blank tee
 * colors offered across Products, Inventory, and Factory dropdowns. */
export async function createGarmentColor(data: { name_en: string; name_ar?: string | null; hex: string }) {
  const db = getDb();
  const existing = await db
    .select({ maxSort: garmentColors.sortOrder })
    .from(garmentColors)
    .orderBy(desc(garmentColors.sortOrder))
    .limit(1);
  const nextSort = (existing[0]?.maxSort ?? -1) + 1;
  const [{ id }] = await db
    .insert(garmentColors)
    .values({
      nameEn: data.name_en.trim(),
      nameAr: data.name_ar?.trim() || null,
      hex: data.hex.trim(),
      sortOrder: nextSort,
    })
    .$returningId();
  const [row] = await db.select().from(garmentColors).where(eq(garmentColors.id, id)).limit(1);
  return toUiColor(row);
}

export async function updateGarmentColor(
  id: number,
  data: { name_en?: string; name_ar?: string | null; hex?: string; sort_order?: number },
) {
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (data.name_en !== undefined) patch.nameEn = data.name_en.trim();
  if (data.name_ar !== undefined) patch.nameAr = data.name_ar?.trim() || null;
  if (data.hex !== undefined) patch.hex = data.hex.trim();
  if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
  await db.update(garmentColors).set(patch).where(eq(garmentColors.id, id));
  const [row] = await db.select().from(garmentColors).where(eq(garmentColors.id, id)).limit(1);
  return row ? toUiColor(row) : null;
}

/** Refuses to delete a color that's still selected on any product, so the
 * storefront's saved swatches never point at a missing color. */
export async function deleteGarmentColor(id: number) {
  const db = getDb();
  const [color] = await db.select().from(garmentColors).where(eq(garmentColors.id, id)).limit(1);
  if (!color) return { success: true };

  const allProducts = await db.select({ id: products.id, nameEn: products.nameEn, approvedColors: products.approvedColors }).from(products);
  const inUse = allProducts.filter((p) => (p.approvedColors ?? []).includes(color.nameEn));
  if (inUse.length > 0) {
    throw new Error(
      `"${color.nameEn}" is still used by ${inUse.length} product${inUse.length > 1 ? 's' : ''} (${inUse
        .map((p) => p.nameEn)
        .join(', ')}). Remove it from those products first.`,
    );
  }

  await db.delete(garmentColors).where(eq(garmentColors.id, id));
  return { success: true };
}

export async function reorderGarmentColors(orderedIds: number[]) {
  const db = getDb();
  await Promise.all(orderedIds.map((id, index) => db.update(garmentColors).set({ sortOrder: index }).where(eq(garmentColors.id, id))));
  return listGarmentColors();
}

function toUiStyle(s: typeof garmentStyles.$inferSelect) {
  return {
    id: String(s.id),
    name_en: s.nameEn,
    name_ar: s.nameAr,
    price_modifier: s.priceModifierCents / 100,
    sizes: s.sizes,
    sort_order: s.sortOrder,
  };
}

export async function listGarmentStyles() {
  const rows = await getDb().select().from(garmentStyles).orderBy(asc(garmentStyles.sortOrder));
  return rows.map(toUiStyle);
}

/** Admin CRUD for the garment style catalog — the master list of fits
 * (Oversized Tee, Classic Tee, Regular Fit, Pique, etc.) offered in the
 * product form's "Garment style" dropdown. */
export async function createGarmentStyle(data: {
  name_en: string;
  name_ar?: string | null;
  price_modifier?: number;
  sizes?: string[];
}) {
  const db = getDb();
  const existing = await db
    .select({ maxSort: garmentStyles.sortOrder })
    .from(garmentStyles)
    .orderBy(desc(garmentStyles.sortOrder))
    .limit(1);
  const nextSort = (existing[0]?.maxSort ?? -1) + 1;
  const [{ id }] = await db
    .insert(garmentStyles)
    .values({
      nameEn: data.name_en.trim(),
      nameAr: data.name_ar?.trim() || null,
      priceModifierCents: Math.round((data.price_modifier ?? 0) * 100),
      sizes: data.sizes?.length ? data.sizes : ["S", "M", "L", "XL", "XXL"],
      sortOrder: nextSort,
    })
    .$returningId();
  const [row] = await db.select().from(garmentStyles).where(eq(garmentStyles.id, id)).limit(1);
  return toUiStyle(row);
}

export async function updateGarmentStyle(
  id: number,
  data: { name_en?: string; name_ar?: string | null; price_modifier?: number; sizes?: string[]; sort_order?: number },
) {
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (data.name_en !== undefined) patch.nameEn = data.name_en.trim();
  if (data.name_ar !== undefined) patch.nameAr = data.name_ar?.trim() || null;
  if (data.price_modifier !== undefined) patch.priceModifierCents = Math.round(data.price_modifier * 100);
  if (data.sizes !== undefined) patch.sizes = data.sizes;
  if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
  await db.update(garmentStyles).set(patch).where(eq(garmentStyles.id, id));
  const [row] = await db.select().from(garmentStyles).where(eq(garmentStyles.id, id)).limit(1);
  return row ? toUiStyle(row) : null;
}

/** Refuses to delete a style that's still selected on any product. */
export async function deleteGarmentStyle(id: number) {
  const db = getDb();
  const [style] = await db.select().from(garmentStyles).where(eq(garmentStyles.id, id)).limit(1);
  if (!style) return { success: true };

  const allProducts = await db.select({ id: products.id, nameEn: products.nameEn, garmentStyle: products.garmentStyle }).from(products);
  const inUse = allProducts.filter((p) => p.garmentStyle === style.nameEn);
  if (inUse.length > 0) {
    throw new Error(
      `"${style.nameEn}" is still used by ${inUse.length} product${inUse.length > 1 ? 's' : ''} (${inUse
        .map((p) => p.nameEn)
        .join(', ')}). Change those products' style first.`,
    );
  }

  await db.delete(garmentStyles).where(eq(garmentStyles.id, id));
  return { success: true };
}

/** Public catalog: everything except drafts, serialized WITHOUT the
 *  ops/factory-only fields (see toUiPublicProduct — audit M4). */
export async function listProducts() {
  const rows = await getDb()
    .select()
    .from(products)
    .where(ne(products.status, "draft"))
    .orderBy(asc(products.sortOrder));
  return rows.map(toUiPublicProduct);
}

/** Admin catalog: includes drafts. */
export async function listAllProducts() {
  const rows = await getDb().select().from(products).orderBy(asc(products.sortOrder));
  return rows.map(toUiProduct);
}

export async function getProductRow(id: number) {
  return getDb().query.products.findFirst({ where: eq(products.id, id) });
}

// ── Per-color product photos ───────────────────────────────────────────────
// Real garment photos keyed by product + color name, so the storefront can
// show the actual printed shirt in the color the shopper picked instead of
// the generic SVG mockup. `images[0]` is treated as the primary/front shot,
// `images[1]` (if present) as the back shot.
function toUiColorImages(row: typeof productColorImages.$inferSelect) {
  return {
    id: String(row.id),
    product_id: String(row.productId),
    color_name: row.colorName,
    images: row.images,
    sort_order: row.sortOrder,
  };
}

export async function listProductColorImages(productId: number) {
  const rows = await getDb()
    .select()
    .from(productColorImages)
    .where(eq(productColorImages.productId, productId))
    .orderBy(asc(productColorImages.sortOrder));
  return rows.map(toUiColorImages);
}

/** Creates or replaces the photo set for one product+color combo. */
export async function upsertProductColorImages(
  productId: number,
  colorName: string,
  images: string[],
) {
  const db = getDb();
  const existing = await db
    .select()
    .from(productColorImages)
    .where(and(eq(productColorImages.productId, productId), eq(productColorImages.colorName, colorName)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(productColorImages)
      .set({ images, updatedAt: new Date() })
      .where(eq(productColorImages.id, existing[0].id));
    return toUiColorImages({ ...existing[0], images });
  }

  const countRows = await db
    .select({ n: productColorImages.id })
    .from(productColorImages)
    .where(eq(productColorImages.productId, productId));
  const [{ id }] = await db
    .insert(productColorImages)
    .values({ productId, colorName, images, sortOrder: countRows.length })
    .$returningId();
  const [row] = await db.select().from(productColorImages).where(eq(productColorImages.id, id)).limit(1);
  return toUiColorImages(row);
}

export async function deleteProductColorImages(productId: number, colorName: string) {
  await getDb()
    .delete(productColorImages)
    .where(and(eq(productColorImages.productId, productId), eq(productColorImages.colorName, colorName)));
  return { success: true };
}
