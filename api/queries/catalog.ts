import { getDb } from "./connection";
import {
  collections,
  garmentColors,
  garmentStyles,
  products,
  type Product,
} from "@db/schema";
import { asc, eq, ne } from "drizzle-orm";

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

export async function listGarmentColors() {
  const rows = await getDb().select().from(garmentColors).orderBy(asc(garmentColors.sortOrder));
  return rows.map((c) => ({
    id: String(c.id),
    name_en: c.nameEn,
    name_ar: c.nameAr,
    hex: c.hex,
    sort_order: c.sortOrder,
  }));
}

export async function listGarmentStyles() {
  const rows = await getDb().select().from(garmentStyles).orderBy(asc(garmentStyles.sortOrder));
  return rows.map((s) => ({
    id: String(s.id),
    name_en: s.nameEn,
    name_ar: s.nameAr,
    price_modifier: s.priceModifierCents / 100,
    sizes: s.sizes,
    sort_order: s.sortOrder,
  }));
}

/** Public catalog: everything except drafts. */
export async function listProducts() {
  const rows = await getDb()
    .select()
    .from(products)
    .where(ne(products.status, "draft"))
    .orderBy(asc(products.sortOrder));
  return rows.map(toUiProduct);
}

/** Admin catalog: includes drafts. */
export async function listAllProducts() {
  const rows = await getDb().select().from(products).orderBy(asc(products.sortOrder));
  return rows.map(toUiProduct);
}

export async function getProductRow(id: number) {
  return getDb().query.products.findFirst({ where: eq(products.id, id) });
}
