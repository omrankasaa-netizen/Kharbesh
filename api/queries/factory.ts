import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "./connection";
import {
  auditLogs,
  blankStock,
  factoryOrderItems,
  factoryOrders,
  orders,
  products,
  stockMovements,
  type FactoryOrder,
  type FactoryOrderItem,
} from "@db/schema";
import { crossedIntoLow, notifyLowStock, type LowStockVariant } from "./inventory";

function toUiItem(i: FactoryOrderItem) {
  return {
    id: String(i.id),
    factory_order_id: String(i.factoryOrderId),
    source_order_id: i.sourceOrderId != null ? String(i.sourceOrderId) : null,
    source_order_number: i.sourceOrderNumber,
    product_id: i.productId != null ? String(i.productId) : null,
    design_name_en: i.designNameEn,
    phrase_en: i.phraseEn,
    product_type: i.productType,
    color: i.color,
    size: i.size,
    quantity: i.quantity,
    placement: i.placement,
    notes: i.notes,
    customer_name: i.customerName,
    customer_phone: i.customerPhone,
    customer_address: i.customerAddress,
    print_file_url: i.printFileUrl,
  };
}

async function toUiFactoryOrder(o: FactoryOrder, items?: FactoryOrderItem[]) {
  const db = getDb();
  const rows = items ?? (await db.select().from(factoryOrderItems).where(eq(factoryOrderItems.factoryOrderId, o.id)));
  return {
    id: String(o.id),
    type: o.type,
    status: o.status,
    notes: o.notes,
    created_date: o.createdAt.toISOString(),
    updated_date: o.updatedAt.toISOString(),
    sent_date: o.sentAt?.toISOString() ?? null,
    fulfilled_date: o.fulfilledAt?.toISOString() ?? null,
    items: rows.map(toUiItem),
  };
}

export async function listFactoryOrders() {
  const db = getDb();
  const rows = await db.select().from(factoryOrders).orderBy(desc(factoryOrders.createdAt));
  const allItems = await db.select().from(factoryOrderItems);
  const itemsByOrder = new Map<number, FactoryOrderItem[]>();
  for (const it of allItems) {
    const list = itemsByOrder.get(it.factoryOrderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.factoryOrderId, list);
  }
  return Promise.all(rows.map((o) => toUiFactoryOrder(o, itemsByOrder.get(o.id) ?? [])));
}

/**
 * Builds a print-job draft from selected customer orders' line items, one
 * factory item per line item.
 *
 * Guards against double-printing: an order already inside a non-cancelled
 * print job is skipped (and reported back via `skipped_order_numbers`)
 * instead of being queued twice. Orders that enter production have their
 * customer-visible status moved to `in_production` in the same transaction
 * so the two systems never disagree.
 */
export async function generatePrintJobFromOrders(orderIds: number[], actorUserId: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const sourceOrders = await tx.select().from(orders).where(inArray(orders.id, orderIds)).for("update");
    if (sourceOrders.length === 0) throw new Error("NO_ORDERS_FOUND");

    // Orders already queued into a live (non-cancelled) print job.
    const queuedRows = await tx
      .select({ sourceOrderId: factoryOrderItems.sourceOrderId })
      .from(factoryOrderItems)
      .innerJoin(factoryOrders, eq(factoryOrderItems.factoryOrderId, factoryOrders.id))
      .where(
        and(
          eq(factoryOrders.type, "print_job"),
          ne(factoryOrders.status, "cancelled"),
          inArray(factoryOrderItems.sourceOrderId, orderIds),
        ),
      );
    const queuedOrderIds = new Set(queuedRows.map((r) => r.sourceOrderId));
    const printableOrders = sourceOrders.filter((o) => !queuedOrderIds.has(o.id));
    const skippedOrderNumbers = sourceOrders.filter((o) => queuedOrderIds.has(o.id)).map((o) => o.orderNumber);
    if (printableOrders.length === 0) throw new Error("ALL_ORDERS_ALREADY_QUEUED");

    const [{ id: factoryOrderId }] = await tx
      .insert(factoryOrders)
      .values({ type: "print_job", status: "draft", createdByUserId: actorUserId })
      .$returningId();

    // Look up print-ready artwork per product once so every line item for
    // that product carries the file the factory should actually print.
    const productIds = [
      ...new Set(
        printableOrders.flatMap((o) => o.items.map((i) => Number(i.productId))).filter((id) => Number.isInteger(id)),
      ),
    ];
    const productRows = productIds.length
      ? await tx.select({ id: products.id, printFileUrl: products.printFileUrl }).from(products).where(inArray(products.id, productIds))
      : [];
    const printFileByProductId = new Map(productRows.map((p) => [p.id, p.printFileUrl]));

    for (const order of printableOrders) {
      for (const item of order.items) {
        const productId = Number.isInteger(Number(item.productId)) ? Number(item.productId) : null;
        await tx.insert(factoryOrderItems).values({
          factoryOrderId,
          sourceOrderId: order.id,
          sourceOrderNumber: order.orderNumber,
          productId,
          designNameEn: item.productName,
          phraseEn: item.phrase ?? null,
          productType: (item.productType as "tee" | "hoodie" | "accessory") ?? "tee",
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          customerName: order.fullName,
          customerPhone: order.phone,
          customerAddress: order.shippingAddress,
          printFileUrl: productId != null ? printFileByProductId.get(productId) ?? null : null,
        });
      }

      // The order is now with the factory — reflect that on the
      // customer-facing status unless it's already further along.
      if (order.status === "order_received" || order.status === "preorder_confirmed") {
        await tx
          .update(orders)
          .set({ status: "in_production", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    }

    await tx.insert(auditLogs).values({
      actorUserId,
      action: "factory_order.created",
      entity: "factory_order",
      entityId: String(factoryOrderId),
      detail: { type: "print_job", orderIds: printableOrders.map((o) => o.id), skippedOrderNumbers },
    });

    const [row] = await tx.select().from(factoryOrders).where(eq(factoryOrders.id, factoryOrderId));
    return { ...(await toUiFactoryOrder(row)), skipped_order_numbers: skippedOrderNumbers };
  });
}

/** Creates a manual restock request draft (blanks to keep on hand, not tied to a customer order). */
export async function createRestockRequest(
  items: { product_type: "tee" | "hoodie" | "accessory"; color: string; size: string; quantity: number }[],
  notes: string | undefined,
  actorUserId: number,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [{ id: factoryOrderId }] = await tx
      .insert(factoryOrders)
      .values({ type: "restock", status: "draft", notes: notes ?? null, createdByUserId: actorUserId })
      .$returningId();

    for (const item of items) {
      await tx.insert(factoryOrderItems).values({
        factoryOrderId,
        productType: item.product_type,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      });
    }

    await tx.insert(auditLogs).values({
      actorUserId,
      action: "factory_order.created",
      entity: "factory_order",
      entityId: String(factoryOrderId),
      detail: { type: "restock", items },
    });

    const [row] = await tx.select().from(factoryOrders).where(eq(factoryOrders.id, factoryOrderId));
    return toUiFactoryOrder(row);
  });
}

export async function markFactoryOrderSent(id: number, actorUserId: number) {
  const db = getDb();
  await db
    .update(factoryOrders)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(factoryOrders.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "factory_order.sent",
    entity: "factory_order",
    entityId: String(id),
    detail: null,
  });
  const [row] = await db.select().from(factoryOrders).where(eq(factoryOrders.id, id));
  return toUiFactoryOrder(row);
}

/**
 * Marks a factory order fulfilled and applies its stock effect: restock
 * orders add blanks on hand; print jobs consume the printed blanks (best
 * effort — logs a movement even if it would go negative would clamp at 0).
 */
export async function markFactoryOrderFulfilled(id: number, actorUserId: number) {
  const db = getDb();
  // Variants that cross INTO low stock during this fulfillment — alerted
  // after the transaction commits, so an email failure can never roll back
  // stock changes.
  const crossedVariants: LowStockVariant[] = [];
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(factoryOrders).where(eq(factoryOrders.id, id)).for("update");
    if (!order) throw new Error("FACTORY_ORDER_NOT_FOUND");
    if (order.status === "fulfilled") return toUiFactoryOrder(order);

    const items = await tx.select().from(factoryOrderItems).where(eq(factoryOrderItems.factoryOrderId, id));
    const sign = order.type === "restock" ? 1 : -1;

    for (const item of items) {
      const [stock] = await tx
        .select()
        .from(blankStock)
        .where(
          and(
            eq(blankStock.productType, item.productType),
            eq(blankStock.color, item.color),
            eq(blankStock.size, item.size),
          ),
        )
        .for("update");

      const delta = sign * item.quantity;
      if (stock) {
        const nextQty = Math.max(0, stock.quantityOnHand + delta);
        await tx.update(blankStock).set({ quantityOnHand: nextQty, updatedAt: new Date() }).where(eq(blankStock.id, stock.id));
        if (crossedIntoLow(
          { quantityOnHand: stock.quantityOnHand, lowStockThreshold: stock.lowStockThreshold },
          { quantityOnHand: nextQty, lowStockThreshold: stock.lowStockThreshold },
        )) {
          crossedVariants.push({
            productType: stock.productType,
            color: stock.color,
            size: stock.size,
            quantityOnHand: nextQty,
            lowStockThreshold: stock.lowStockThreshold,
          });
        }
        await tx.insert(stockMovements).values({
          stockId: stock.id,
          type: order.type === "restock" ? "restock" : "consumed",
          quantityDelta: delta,
          note: `Factory order #${id} fulfilled`,
          actorUserId,
        });
      } else if (order.type === "restock") {
        const [{ id: stockId }] = await tx
          .insert(blankStock)
          .values({
            productType: item.productType,
            color: item.color,
            size: item.size,
            quantityOnHand: item.quantity,
          })
          .$returningId();
        await tx.insert(stockMovements).values({
          stockId,
          type: "restock",
          quantityDelta: item.quantity,
          note: `Factory order #${id} fulfilled (new variant)`,
          actorUserId,
        });
      }
    }

    await tx
      .update(factoryOrders)
      .set({ status: "fulfilled", fulfilledAt: new Date(), updatedAt: new Date() })
      .where(eq(factoryOrders.id, id));

    await tx.insert(auditLogs).values({
      actorUserId,
      action: "factory_order.fulfilled",
      entity: "factory_order",
      entityId: String(id),
      detail: null,
    });

    const [row] = await tx.select().from(factoryOrders).where(eq(factoryOrders.id, id));
    return toUiFactoryOrder(row);
  });
  notifyLowStock(crossedVariants);
  return result;
}

export async function cancelFactoryOrder(id: number, actorUserId: number) {
  const db = getDb();
  await db
    .update(factoryOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(factoryOrders.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "factory_order.cancelled",
    entity: "factory_order",
    entityId: String(id),
    detail: null,
  });
  const [row] = await db.select().from(factoryOrders).where(eq(factoryOrders.id, id));
  return toUiFactoryOrder(row);
}
