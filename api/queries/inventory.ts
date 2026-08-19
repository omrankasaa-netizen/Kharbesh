import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./connection";
import { auditLogs, blankStock, stockMovements } from "@db/schema";

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
  return db.transaction(async (tx) => {
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

    const [updated] = await tx.select().from(blankStock).where(eq(blankStock.id, input.id));
    return toUiStock(updated);
  });
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
