import { getDb } from "./connection";
import { auditLogs, orders, products, type Order, type OrderLineItem } from "@db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";

export function toUiOrder(o: Order) {
  return {
    id: String(o.id),
    order_number: o.orderNumber,
    email: o.email,
    phone: o.phone,
    full_name: o.fullName,
    shipping_address: o.shippingAddress,
    city: o.city,
    country: o.country,
    notes: o.notes,
    items: o.items,
    subtotal: o.subtotalCents / 100,
    shipping: o.shippingCents / 100,
    total: o.totalCents / 100,
    status: o.status,
    internal_status: o.internalStatus,
    language: o.language,
    is_guest: o.isGuest,
    created_by_id: o.userId != null ? String(o.userId) : null,
    created_date: o.createdAt.toISOString(),
  };
}

function makeOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `KH-${stamp}-${suffix}`;
}

export type CreateOrderInput = {
  email: string;
  phone: string;
  fullName: string;
  shippingAddress: string;
  city: string;
  country: string;
  notes?: string;
  language: "en" | "ar";
  userId?: number;
  items: { productId: string; color: string; size: string; quantity: number }[];
};

/**
 * Creates an order with server-side pricing: the client never sets prices.
 * Validates products are active, colors/sizes approved, and preorder
 * capacity. Increments units_sold atomically in one transaction.
 */
export async function createOrder(input: CreateOrderInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const lineItems: OrderLineItem[] = [];
    let subtotalCents = 0;

    for (const item of input.items) {
      const productId = Number(item.productId);
      if (!Number.isInteger(productId)) {
        throw new Error("INVALID_PRODUCT");
      }
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .for("update");
      if (!product || product.status !== "active") {
        throw new Error("PRODUCT_UNAVAILABLE");
      }
      if (!product.approvedColors.includes(item.color)) {
        throw new Error("COLOR_UNAVAILABLE");
      }
      if (!product.sizes.includes(item.size)) {
        throw new Error("SIZE_UNAVAILABLE");
      }
      if (item.quantity < 1 || item.quantity > 20) {
        throw new Error("INVALID_QUANTITY");
      }
      if (
        product.preorderType === "limited_quantity" &&
        product.preorderCapacity != null &&
        product.unitsSold + item.quantity > product.preorderCapacity
      ) {
        throw new Error("SOLD_OUT");
      }

      const lineTotalCents = product.priceCents * item.quantity;
      subtotalCents += lineTotalCents;
      lineItems.push({
        productId: String(product.id),
        productName: product.nameEn,
        phrase: product.phraseAr ?? undefined,
        productType: product.productType,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.priceCents / 100,
        lineTotal: lineTotalCents / 100,
      });

      await tx
        .update(products)
        .set({ unitsSold: sql`${products.unitsSold} + ${item.quantity}` })
        .where(eq(products.id, product.id));
    }

    const shippingCents = 0;
    const [{ id }] = await tx
      .insert(orders)
      .values({
        orderNumber: makeOrderNumber(),
        userId: input.userId ?? null,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        shippingAddress: input.shippingAddress,
        city: input.city,
        country: input.country,
        notes: input.notes ?? null,
        items: lineItems,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
        status: "order_received",
        internalStatus: "payment_pending",
        language: input.language,
        isGuest: input.userId == null,
      })
      .$returningId();

    await tx.insert(auditLogs).values({
      actorUserId: input.userId ?? null,
      action: "order.created",
      entity: "order",
      entityId: String(id),
      detail: { itemCount: lineItems.length, totalCents: subtotalCents + shippingCents },
    });

    const [row] = await tx.select().from(orders).where(eq(orders.id, id));
    return toUiOrder(row);
  });
}

export async function getOrderById(id: number) {
  const row = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  return row ? toUiOrder(row) : null;
}

/** Guest order tracking: requires order number AND matching email/phone. */
export async function trackOrder(orderNumber: string, contact: string) {
  const db = getDb();
  const normalized = contact.trim().toLowerCase();
  const row = await db.query.orders.findFirst({
    where: and(
      eq(orders.orderNumber, orderNumber.trim()),
      or(eq(sql`lower(${orders.email})`, normalized), eq(orders.phone, contact.trim())),
    ),
  });
  return row ? toUiOrder(row) : null;
}

export async function listOrdersForUser(email: string) {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(eq(sql`lower(${orders.email})`, email.toLowerCase()))
    .orderBy(desc(orders.createdAt));
  return rows.map(toUiOrder);
}

export async function listAllOrders(limit = 200) {
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  return rows.map(toUiOrder);
}

export async function updateOrderStatus(
  id: number,
  status: (typeof orders.status.enumValues)[number],
  actorUserId: number,
) {
  const db = getDb();
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "order.status_updated",
    entity: "order",
    entityId: String(id),
    detail: { status },
  });
  const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  return row ? toUiOrder(row) : null;
}
