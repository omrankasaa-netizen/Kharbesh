import { getDb } from "./connection";
import { promoCodes, discounts, campaigns, products } from "@db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";

// ── Mappers ──────────────────────────────────────────────────────────────────

function toUiPromoCode(p: typeof promoCodes.$inferSelect) {
  return {
    id: String(p.id),
    code: p.code,
    type: p.type,
    value: p.value,
    min_order: p.minOrderCents != null ? p.minOrderCents / 100 : null,
    max_uses: p.maxUses,
    uses_count: p.usesCount,
    active: p.active,
    starts_at: p.startsAt ? p.startsAt.toISOString() : null,
    expires_at: p.expiresAt ? p.expiresAt.toISOString() : null,
    created_date: p.createdAt.toISOString(),
  };
}

function toUiDiscount(d: typeof discounts.$inferSelect) {
  return {
    id: String(d.id),
    name_en: d.nameEn,
    name_ar: d.nameAr,
    type: d.type,
    value: d.value,
    applies_to: d.appliesTo,
    applies_value: d.appliesValue,
    active: d.active,
    starts_at: d.startsAt ? d.startsAt.toISOString() : null,
    expires_at: d.expiresAt ? d.expiresAt.toISOString() : null,
    created_date: d.createdAt.toISOString(),
  };
}

function toUiCampaign(c: typeof campaigns.$inferSelect) {
  return {
    id: String(c.id),
    title_en: c.titleEn,
    title_ar: c.titleAr,
    subtitle_en: c.subtitleEn,
    subtitle_ar: c.subtitleAr,
    cta_label_en: c.ctaLabelEn,
    cta_label_ar: c.ctaLabelAr,
    link_url: c.linkUrl,
    promo_code_id: c.promoCodeId != null ? String(c.promoCodeId) : null,
    discount_id: c.discountId != null ? String(c.discountId) : null,
    active: c.active,
    starts_at: c.startsAt ? c.startsAt.toISOString() : null,
    expires_at: c.expiresAt ? c.expiresAt.toISOString() : null,
    sort_order: c.sortOrder,
    created_date: c.createdAt.toISOString(),
  };
}

export function isWithinWindow(startsAt: Date | null, expiresAt: Date | null, now = new Date()) {
  if (startsAt && now < startsAt) return false;
  if (expiresAt && now > expiresAt) return false;
  return true;
}

// ── Promo codes (admin/marketing tier CRUD) ─────────────────────────────────

export async function listPromoCodes() {
  const rows = await getDb().select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return rows.map(toUiPromoCode);
}

export type PromoCodeWritableFields = {
  code?: string;
  type?: "percent" | "fixed";
  value?: number;
  min_order?: number | null;
  max_uses?: number | null;
  active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
};

export async function createPromoCode(
  data: PromoCodeWritableFields & { code: string; type: "percent" | "fixed"; value: number },
  actorUserId: number,
) {
  const db = getDb();
  const [{ id }] = await db
    .insert(promoCodes)
    .values({
      code: data.code.trim().toUpperCase(),
      type: data.type,
      value: Math.round(data.value),
      minOrderCents: data.min_order != null ? Math.round(data.min_order * 100) : null,
      maxUses: data.max_uses ?? null,
      active: data.active ?? true,
      startsAt: data.starts_at ? new Date(data.starts_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      createdByUserId: actorUserId,
    })
    .$returningId();
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  return toUiPromoCode(row);
}

export async function updatePromoCode(id: number, data: PromoCodeWritableFields) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.code !== undefined) patch.code = data.code.trim().toUpperCase();
  if (data.type !== undefined) patch.type = data.type;
  if (data.value !== undefined) patch.value = Math.round(data.value);
  if (data.min_order !== undefined) patch.minOrderCents = data.min_order != null ? Math.round(data.min_order * 100) : null;
  if (data.max_uses !== undefined) patch.maxUses = data.max_uses;
  if (data.active !== undefined) patch.active = data.active;
  if (data.starts_at !== undefined) patch.startsAt = data.starts_at ? new Date(data.starts_at) : null;
  if (data.expires_at !== undefined) patch.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  await db.update(promoCodes).set(patch).where(eq(promoCodes.id, id));
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  return row ? toUiPromoCode(row) : null;
}

export async function deletePromoCode(id: number) {
  await getDb().delete(promoCodes).where(eq(promoCodes.id, id));
  return { success: true };
}

// ── Automatic discounts (admin/marketing tier CRUD) ─────────────────────────

export async function listDiscounts() {
  const rows = await getDb().select().from(discounts).orderBy(desc(discounts.createdAt));
  return rows.map(toUiDiscount);
}

export type DiscountWritableFields = {
  name_en?: string;
  name_ar?: string | null;
  type?: "percent" | "fixed";
  value?: number;
  applies_to?: "all" | "product_type" | "collection";
  applies_value?: string | null;
  active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
};

export async function createDiscount(
  data: DiscountWritableFields & { name_en: string; type: "percent" | "fixed"; value: number },
) {
  const db = getDb();
  const [{ id }] = await db
    .insert(discounts)
    .values({
      nameEn: data.name_en,
      nameAr: data.name_ar ?? null,
      type: data.type,
      value: Math.round(data.value),
      appliesTo: data.applies_to ?? "all",
      appliesValue: data.applies_value ?? null,
      active: data.active ?? true,
      startsAt: data.starts_at ? new Date(data.starts_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    })
    .$returningId();
  const [row] = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
  return toUiDiscount(row);
}

export async function updateDiscount(id: number, data: DiscountWritableFields) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name_en !== undefined) patch.nameEn = data.name_en;
  if (data.name_ar !== undefined) patch.nameAr = data.name_ar;
  if (data.type !== undefined) patch.type = data.type;
  if (data.value !== undefined) patch.value = Math.round(data.value);
  if (data.applies_to !== undefined) patch.appliesTo = data.applies_to;
  if (data.applies_value !== undefined) patch.appliesValue = data.applies_value;
  if (data.active !== undefined) patch.active = data.active;
  if (data.starts_at !== undefined) patch.startsAt = data.starts_at ? new Date(data.starts_at) : null;
  if (data.expires_at !== undefined) patch.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  await db.update(discounts).set(patch).where(eq(discounts.id, id));
  const [row] = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
  return row ? toUiDiscount(row) : null;
}

export async function deleteDiscount(id: number) {
  await getDb().delete(discounts).where(eq(discounts.id, id));
  return { success: true };
}

// ── Homepage campaigns (admin/marketing tier CRUD + public read) ───────────

export async function listCampaigns() {
  const rows = await getDb().select().from(campaigns).orderBy(campaigns.sortOrder);
  return rows.map(toUiCampaign);
}

/** Public: only active campaigns currently inside their date window. */
export async function listActiveCampaigns() {
  const rows = await getDb().select().from(campaigns).where(eq(campaigns.active, true)).orderBy(campaigns.sortOrder);
  const now = new Date();
  return rows.filter((c) => isWithinWindow(c.startsAt, c.expiresAt, now)).map(toUiCampaign);
}

export type CampaignWritableFields = {
  title_en?: string;
  title_ar?: string | null;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  cta_label_en?: string | null;
  cta_label_ar?: string | null;
  link_url?: string | null;
  promo_code_id?: string | null;
  discount_id?: string | null;
  active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  sort_order?: number;
};

export async function createCampaign(data: CampaignWritableFields & { title_en: string }) {
  const db = getDb();
  const [{ id }] = await db
    .insert(campaigns)
    .values({
      titleEn: data.title_en,
      titleAr: data.title_ar ?? null,
      subtitleEn: data.subtitle_en ?? null,
      subtitleAr: data.subtitle_ar ?? null,
      ctaLabelEn: data.cta_label_en ?? null,
      ctaLabelAr: data.cta_label_ar ?? null,
      linkUrl: data.link_url ?? null,
      promoCodeId: data.promo_code_id ? Number(data.promo_code_id) : null,
      discountId: data.discount_id ? Number(data.discount_id) : null,
      active: data.active ?? true,
      startsAt: data.starts_at ? new Date(data.starts_at) : null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      sortOrder: data.sort_order ?? 0,
    })
    .$returningId();
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return toUiCampaign(row);
}

export async function updateCampaign(id: number, data: CampaignWritableFields) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title_en !== undefined) patch.titleEn = data.title_en;
  if (data.title_ar !== undefined) patch.titleAr = data.title_ar;
  if (data.subtitle_en !== undefined) patch.subtitleEn = data.subtitle_en;
  if (data.subtitle_ar !== undefined) patch.subtitleAr = data.subtitle_ar;
  if (data.cta_label_en !== undefined) patch.ctaLabelEn = data.cta_label_en;
  if (data.cta_label_ar !== undefined) patch.ctaLabelAr = data.cta_label_ar;
  if (data.link_url !== undefined) patch.linkUrl = data.link_url;
  if (data.promo_code_id !== undefined) patch.promoCodeId = data.promo_code_id ? Number(data.promo_code_id) : null;
  if (data.discount_id !== undefined) patch.discountId = data.discount_id ? Number(data.discount_id) : null;
  if (data.active !== undefined) patch.active = data.active;
  if (data.starts_at !== undefined) patch.startsAt = data.starts_at ? new Date(data.starts_at) : null;
  if (data.expires_at !== undefined) patch.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
  await db.update(campaigns).set(patch).where(eq(campaigns.id, id));
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return row ? toUiCampaign(row) : null;
}

export async function deleteCampaign(id: number) {
  await getDb().delete(campaigns).where(eq(campaigns.id, id));
  return { success: true };
}

// ── Checkout-time discount math ─────────────────────────────────────────────
// Kept simple and predictable: for each order line, at most the single
// best-matching automatic discount applies (no stacking two automatic
// discounts on the same item). A promo code, if valid, then applies on top
// of the already-discounted subtotal. Both are itemized in `appliedDiscounts`
// so admins/customers can see exactly what was applied.

export type DiscountRow = typeof discounts.$inferSelect;
export type LineForDiscount = { productType: string; collectionName: string | null; lineTotalCents: number };

export function matchesDiscount(discount: DiscountRow, line: LineForDiscount) {
  if (discount.appliesTo === "all") return true;
  if (discount.appliesTo === "product_type") return discount.appliesValue === line.productType;
  if (discount.appliesTo === "collection") return discount.appliesValue === line.collectionName;
  return false;
}

export function discountAmountCents(discount: { type: "percent" | "fixed"; value: number }, baseCents: number) {
  return discount.type === "percent" ? Math.round((baseCents * discount.value) / 100) : Math.min(discount.value, baseCents);
}

/** Automatic discounts that are active and inside their date window, loaded once per order. */
export async function loadActiveAutomaticDiscounts() {
  const rows = await getDb().select().from(discounts).where(eq(discounts.active, true));
  const now = new Date();
  return rows.filter((d) => isWithinWindow(d.startsAt, d.expiresAt, now));
}

/** Best automatic discount for one line item, or null if none match. */
export function pickAutomaticDiscount(activeDiscounts: DiscountRow[], line: LineForDiscount) {
  let best: { discount: DiscountRow; amountCents: number } | null = null;
  for (const d of activeDiscounts) {
    if (!matchesDiscount(d, line)) continue;
    const amountCents = discountAmountCents(d, line.lineTotalCents);
    if (!best || amountCents > best.amountCents) best = { discount: d, amountCents };
  }
  return best;
}

/**
 * Validates a promo code against the order's subtotal (after automatic
 * discounts are subtracted). Throws a short error code the router maps to a
 * friendly message; does NOT increment uses_count — the caller does that
 * inside the order transaction only once the order is actually placed.
 */
export async function findValidPromoCode(code: string, netSubtotalCents: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code.trim().toUpperCase()))
    .limit(1);
  if (!row) throw new Error("PROMO_NOT_FOUND");
  if (!row.active) throw new Error("PROMO_INACTIVE");
  if (!isWithinWindow(row.startsAt, row.expiresAt)) throw new Error("PROMO_EXPIRED");
  if (row.maxUses != null && row.usesCount >= row.maxUses) throw new Error("PROMO_MAX_USES");
  if (row.minOrderCents != null && netSubtotalCents < row.minOrderCents) throw new Error("PROMO_MIN_ORDER");
  const amountCents = discountAmountCents(row, netSubtotalCents);
  return { row, amountCents };
}

/** Public checkout endpoint: preview a code's discount without placing an order. */
export async function previewPromoCode(code: string, subtotalCents: number) {
  const { amountCents, row } = await findValidPromoCode(code, subtotalCents);
  return { code: row.code, type: row.type, value: row.value, discount_cents: amountCents, discount: amountCents / 100 };
}

/**
 * Public checkout endpoint: preview the automatic discounts a cart would
 * receive, using the exact same per-line "best match wins" logic and
 * authoritative server-side prices as `createOrder`. This keeps what the
 * checkout page shows in sync with what the server will actually charge —
 * automatic discounts apply silently (no code needed), so without this
 * preview the customer's displayed total could differ from their final
 * order total. Products are re-fetched here (never trusting client-supplied
 * price/type) exactly like `createOrder` does.
 */
export async function previewCartDiscounts(items: { productId: string; quantity: number }[]) {
  const db = getDb();
  const ids = [...new Set(items.map((i) => Number(i.productId)).filter((n) => Number.isInteger(n)))];
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const activeDiscounts = await loadActiveAutomaticDiscounts();
  let subtotalCents = 0;
  let automaticDiscountCents = 0;
  const appliedDiscounts: { name: string; amountCents: number }[] = [];

  for (const item of items) {
    const product = byId.get(Number(item.productId));
    if (!product) continue;
    const lineTotalCents = product.priceCents * item.quantity;
    subtotalCents += lineTotalCents;
    const best = pickAutomaticDiscount(activeDiscounts, {
      productType: product.productType,
      collectionName: product.collectionName,
      lineTotalCents,
    });
    if (best && best.amountCents > 0) {
      automaticDiscountCents += best.amountCents;
      appliedDiscounts.push({ name: best.discount.nameEn, amountCents: best.amountCents });
    }
  }

  return {
    subtotal_cents: subtotalCents,
    subtotal: subtotalCents / 100,
    automatic_discount_cents: automaticDiscountCents,
    automatic_discount: automaticDiscountCents / 100,
    net_subtotal_cents: Math.max(0, subtotalCents - automaticDiscountCents),
    net_subtotal: Math.max(0, subtotalCents - automaticDiscountCents) / 100,
    applied_discounts: appliedDiscounts.map((d) => ({ name: d.name, amount: d.amountCents / 100 })),
  };
}

type Db = ReturnType<typeof getDb>;

export async function incrementPromoCodeUses(id: number, tx: Db) {
  await tx
    .update(promoCodes)
    .set({ usesCount: sql`${promoCodes.usesCount} + 1` })
    .where(eq(promoCodes.id, id));
}
