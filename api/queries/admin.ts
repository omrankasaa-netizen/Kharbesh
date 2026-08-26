import { getDb } from "./connection";
import { auditLogs, products, users } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { toUiProduct, upsertProductColorImages } from "./catalog";

export async function listUsers() {
  const rows = await getDb().select().from(users);
  return rows.map((u) => ({
    id: String(u.id),
    full_name: u.name,
    email: u.email,
    role: u.role,
    created_date: u.createdAt.toISOString(),
  }));
}

export type ProductWritableFields = {
  name_en?: string;
  name_ar?: string | null;
  phrase_en?: string | null;
  phrase_ar?: string | null;
  payoff_en?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  collection_name?: string | null;
  mood?: string | null;
  product_type?: "tee" | "hoodie" | "accessory";
  garment_style?: string | null;
  fit_en?: string | null;
  care_en?: string | null;
  care_ar?: string | null;
  measurements_en?: string | null;
  approved_colors?: string[];
  sizes?: string[];
  placement?: string | null;
  price?: number;
  compare_at_price?: number | null;
  images?: string[];
  print_file_url?: string | null;
  status?: "active" | "draft" | "archived";
  preorder_type?: "open_until" | "quantity_target" | "limited_quantity" | "always_on";
  preorder_close_date?: string | null;
  preorder_capacity?: number | null;
  units_sold?: number;
  estimated_production_days?: number;
  estimated_dispatch_window?: string | null;
  drop_name?: string | null;
  sort_order?: number;
};

function mapProductPatch(data: ProductWritableFields): Partial<typeof products.$inferInsert> {
  const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (data.name_en !== undefined) patch.nameEn = data.name_en;
  if (data.name_ar !== undefined) patch.nameAr = data.name_ar;
  if (data.phrase_en !== undefined) patch.phraseEn = data.phrase_en;
  if (data.phrase_ar !== undefined) patch.phraseAr = data.phrase_ar;
  if (data.payoff_en !== undefined) patch.payoffEn = data.payoff_en;
  if (data.description_en !== undefined) patch.descriptionEn = data.description_en;
  if (data.description_ar !== undefined) patch.descriptionAr = data.description_ar;
  if (data.collection_name !== undefined) patch.collectionName = data.collection_name;
  if (data.mood !== undefined) patch.mood = data.mood;
  if (data.product_type !== undefined) patch.productType = data.product_type;
  if (data.garment_style !== undefined) patch.garmentStyle = data.garment_style;
  if (data.fit_en !== undefined) patch.fitEn = data.fit_en;
  if (data.care_en !== undefined) patch.careEn = data.care_en;
  if (data.care_ar !== undefined) patch.careAr = data.care_ar;
  if (data.measurements_en !== undefined) patch.measurementsEn = data.measurements_en;
  if (data.approved_colors !== undefined) patch.approvedColors = data.approved_colors;
  if (data.sizes !== undefined) patch.sizes = data.sizes;
  if (data.placement !== undefined) patch.placement = data.placement;
  if (data.price !== undefined) patch.priceCents = Math.round(data.price * 100);
  if (data.compare_at_price !== undefined)
    patch.compareAtPriceCents = data.compare_at_price != null ? Math.round(data.compare_at_price * 100) : null;
  if (data.images !== undefined) patch.images = data.images;
  if (data.print_file_url !== undefined) patch.printFileUrl = data.print_file_url;
  if (data.status !== undefined) patch.status = data.status;
  if (data.preorder_type !== undefined) patch.preorderType = data.preorder_type;
  if (data.preorder_close_date !== undefined) patch.preorderCloseDate = data.preorder_close_date;
  if (data.preorder_capacity !== undefined) patch.preorderCapacity = data.preorder_capacity;
  if (data.units_sold !== undefined) patch.unitsSold = data.units_sold;
  if (data.estimated_production_days !== undefined) patch.estimatedProductionDays = data.estimated_production_days;
  if (data.estimated_dispatch_window !== undefined) patch.estimatedDispatchWindow = data.estimated_dispatch_window;
  if (data.drop_name !== undefined) patch.dropName = data.drop_name;
  if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
  return patch;
}

/** Admin/staff partial update for a product. Fields arrive in UI (snake_case) shape. */
export async function updateProduct(id: number, data: ProductWritableFields, actorUserId: number) {
  const patch = mapProductPatch(data);

  const db = getDb();
  await db.update(products).set(patch).where(eq(products.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "product.updated",
    entity: "product",
    entityId: String(id),
    detail: data,
  });
  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  return row ? toUiProduct(row) : null;
}

/** Creates a new product from the Product Manager form. */
export async function createProduct(
  data: ProductWritableFields & { name_en: string; product_type: "tee" | "hoodie" | "accessory" },
  actorUserId: number,
) {
  const db = getDb();
  const [{ id }] = await db
    .insert(products)
    .values({
      nameEn: data.name_en,
      nameAr: data.name_ar ?? null,
      phraseEn: data.phrase_en ?? null,
      phraseAr: data.phrase_ar ?? null,
      payoffEn: data.payoff_en ?? null,
      descriptionEn: data.description_en ?? null,
      descriptionAr: data.description_ar ?? null,
      collectionName: data.collection_name ?? null,
      mood: data.mood ?? null,
      productType: data.product_type,
      garmentStyle: data.garment_style ?? null,
      fitEn: data.fit_en ?? null,
      careEn: data.care_en ?? null,
      careAr: data.care_ar ?? null,
      measurementsEn: data.measurements_en ?? null,
      approvedColors: data.approved_colors ?? [],
      sizes: data.sizes ?? [],
      placement: data.placement ?? null,
      priceCents: Math.round((data.price ?? 0) * 100),
      compareAtPriceCents: data.compare_at_price != null ? Math.round(data.compare_at_price * 100) : null,
      images: data.images ?? [],
      printFileUrl: data.print_file_url ?? null,
      status: data.status ?? "draft",
      preorderType: data.preorder_type ?? "always_on",
      preorderCloseDate: data.preorder_close_date ?? null,
      preorderCapacity: data.preorder_capacity ?? null,
      estimatedProductionDays: data.estimated_production_days ?? 10,
      estimatedDispatchWindow: data.estimated_dispatch_window ?? null,
      dropName: data.drop_name ?? null,
      sortOrder: data.sort_order ?? 0,
    })
    .$returningId();

  await db.insert(auditLogs).values({
    actorUserId,
    action: "product.created",
    entity: "product",
    entityId: String(id),
    detail: { name_en: data.name_en },
  });

  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  return row ? toUiProduct(row) : null;
}

/**
 * Creates many products in one request — the "Bulk Import" admin page's
 * server-side counterpart. Each item is created and its color photos are
 * attached independently, with per-item try/catch: one bad row (e.g. a
 * duplicate name check added later, or a transient error) doesn't roll
 * back the other 29. Callers should surface `results` to show exactly
 * which rows succeeded so nothing silently disappears.
 */
export async function bulkCreateProducts(
  items: Array<{
    product: ProductWritableFields & { name_en: string; product_type: "tee" | "hoodie" | "accessory" };
    colorImages?: Record<string, string[]>;
  }>,
  actorUserId: number,
) {
  const results: Array<{ success: boolean; id?: string; name_en: string; error?: string }> = [];

  for (const item of items) {
    try {
      const created = await createProduct(item.product, actorUserId);
      if (created && item.colorImages) {
        for (const [colorName, images] of Object.entries(item.colorImages)) {
          if (images?.length) await upsertProductColorImages(Number(created.id), colorName, images);
        }
      }
      results.push({ success: true, id: created?.id, name_en: item.product.name_en });
    } catch (err) {
      results.push({
        success: false,
        name_en: item.product.name_en,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await getDb().insert(auditLogs).values({
    actorUserId,
    action: "product.bulk_created",
    entity: "product",
    entityId: null,
    detail: { total: items.length, succeeded: results.filter((r) => r.success).length },
  });

  return results;
}

export async function deleteProduct(id: number, actorUserId: number) {
  const db = getDb();
  await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "product.archived",
    entity: "product",
    entityId: String(id),
    detail: null,
  });
  return { success: true };
}

/**
 * Permanently removes a product row (super_admin only — gated in the
 * router, not here). `product_color_images` cascade-deletes at the DB
 * level via its FK. Meant for pre-launch test-data cleanup, not routine
 * catalog management — staff should keep using `deleteProduct` (archive)
 * day to day.
 */
export async function hardDeleteProduct(id: number, actorUserId: number) {
  const db = getDb();
  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  await db.delete(products).where(eq(products.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "product.hard_deleted",
    entity: "product",
    entityId: String(id),
    detail: row ? { name_en: row.nameEn } : null,
  });
  return { success: true };
}

export async function listAuditLogs(limit = 100) {
  return getDb().select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}
