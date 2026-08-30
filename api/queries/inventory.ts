import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./connection";
import { auditLogs, blankStock, stockMovements } from "@db/schema";
import { sendEmail } from "../lib/email";
import { lowStockAlertEmail } from "../lib/emailTemplates";
import { env } from "../lib/env";

export type LowStockVariant = {
  productType: string;
  color: string;
  size: string;
  quantityOnHand: number;
  lowStockThreshold: number;
};

/** True when the change moves the variant from OK into low stock — the
 *  only transition that should trigger an alert email (edits that keep an
 *  already-low variant low must not re-notify). */
export function crossedIntoLow(
  prev: { quantityOnHand: number; lowStockThreshold: number },
  next: { quantityOnHand: number; lowStockThreshold: number },
) {
  const wasLow = prev.quantityOnHand <= prev.lowStockThreshold;
  const isLow = next.quantityOnHand <= next.lowStockThreshold;
  return !wasLow && isLow;
}

/** Fire-and-forget low-stock alert to the ops inbox. Email is best-effort
 *  and must never roll back or fail a stock change, so callers run this
 *  AFTER the stock transaction commits. */
export function notifyLowStock(variants: LowStockVariant[]) {
  if (variants.length === 0) return;
  void (async () => {
    try {
      const { subject, html, text } = lowStockAlertEmail(variants);
      await sendEmail({ to: env.adminNotificationEmail, subject, html, text });
    } catch (err) {
      console.error("[inventory] low-stock alert email failed", err);
    }
  })();
}

export function toUiStock(s: typeof blankStock.$inferSelect) {
  return {
    id: String(s.id),
    product_type: s.productType,
    color: s.color,
    size: s.size,
    quantity_on_hand: s.quantityOnHand,
    low_stock_threshold: s.lowStockThreshold,
    is_low: s.quantityOnHand <= s.lowStockThreshold,
    updated_date: s.updatedAt.toISOString(),
  };
}

export async function listBlankStock() {
  const rows = await getDb()
    .select()
    .from(blankStock)
    .orderBy(asc(blankStock.productType), asc(blankStock.color), asc(blankStock.size));
  return rows.map(toUiStock);
}

/** Creates a new blank-stock variant (productType + color + size) or updates its threshold. */
export async function upsertStockVariant(
  data: {
    product_type: "tee" | "hoodie" | "accessory";
    color: string;
    size: string;
    quantity_on_hand?: number;
    low_stock_threshold?: number;
  },
  actorUserId: number,
) {
  const db = getDb();
  const existing = await db.query.blankStock.findFirst({
    where: and(
      eq(blankStock.productType, data.product_type),
      eq(blankStock.color, data.color),
      eq(blankStock.size, data.size),
    ),
  });

  if (existing) {
    const patch: Partial<typeof blankStock.$inferInsert> = { updatedAt: new Date() };
    if (data.low_stock_threshold !== undefined) patch.lowStockThreshold = data.low_stock_threshold;
    if (data.quantity_on_hand !== undefined) patch.quantityOnHand = data.quantity_on_hand;
    await db.update(blankStock).set(patch).where(eq(blankStock.id, existing.id));
    const [row] = await db.select().from(blankStock).where(eq(blankStock.id, existing.id));
    // Alert only when this edit crosses the variant INTO low stock.
    if (
      crossedIntoLow(
        { quantityOnHand: existing.quantityOnHand, lowStockThreshold: existing.lowStockThreshold },
        { quantityOnHand: row.quantityOnHand, lowStockThreshold: row.lowStockThreshold },
      )
    ) {
      notifyLowStock([{
        productType: row.productType,
        color: row.color,
        size: row.size,
        quantityOnHand: row.quantityOnHand,
        lowStockThreshold: row.lowStockThreshold,
      }]);
    }
    return toUiStock(row);
  }

  const [{ id }] = await db
    .insert(blankStock)
    .values({
      productType: data.product_type,
      color: data.color,
      size: data.size,
      quantityOnHand: data.quantity_on_hand ?? 0,
      lowStockThreshold: data.low_stock_threshold ?? 2,
    })
    .$returningId();

  await db.insert(auditLogs).values({
    actorUserId,
    action: "stock.variant_created",
    entity: "blank_stock",
    entityId: String(id),
    detail: data,
  });

  const [row] = await db.select().from(blankStock).where(eq(blankStock.id, id));
  return toUiStock(row);
}

/**
 * Adjusts stock on hand by a signed delta (restock = positive, consumed =
 * negative, adjustment = manual correction either way). Clamped at 0.
 */
export async function adjustStock(
  input: { id: number; delta: number; type: "restock" | "consumed" | "adjustment"; note?: string },
  actorUserId: number,
) {
  const db = getDb();
  let crossed: LowStockVariant | null = null;
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(blankStock).where(eq(blankStock.id, input.id)).for("update");
    if (!row) throw new Error("STOCK_NOT_FOUND");

    const nextQty = Math.max(0, row.quantityOnHand + input.delta);
    await tx
      .update(blankStock)
      .set({ quantityOnHand: nextQty, updatedAt: new Date() })
      .where(eq(blankStock.id, input.id));

    await tx.insert(stockMovements).values({
      stockId: input.id,
      type: input.type,
      quantityDelta: input.delta,
      note: input.note ?? null,
      actorUserId,
    });

    if (crossedIntoLow(
      { quantityOnHand: row.quantityOnHand, lowStockThreshold: row.lowStockThreshold },
      { quantityOnHand: nextQty, lowStockThreshold: row.lowStockThreshold },
    )) {
      crossed = {
        productType: row.productType,
        color: row.color,
        size: row.size,
        quantityOnHand: nextQty,
        lowStockThreshold: row.lowStockThreshold,
      };
    }

    const [updated] = await tx.select().from(blankStock).where(eq(blankStock.id, input.id));
    return toUiStock(updated);
  });
  // Email only after the transaction committed — an email failure must
  // never roll back a stock change.
  if (crossed) notifyLowStock([crossed]);
  return result;
}

export async function listStockMovements(stockId?: number, limit = 100) {
  const db = getDb();
  const rows = stockId
    ? await db.select().from(stockMovements).where(eq(stockMovements.stockId, stockId)).limit(limit)
    : await db.select().from(stockMovements).limit(limit);
  return rows
    .sort((a, b) => b.id - a.id)
    .map((m) => ({
      id: String(m.id),
      stock_id: String(m.stockId),
      type: m.type,
      quantity_delta: m.quantityDelta,
      note: m.note,
      created_date: m.createdAt.toISOString(),
    }));
}
