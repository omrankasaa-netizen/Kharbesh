import { getDb } from "./connection";
import { auditLogs, discounts, orders, products, promoCodes, type Order, type OrderLineItem } from "@db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { discountAmountCents, isWithinWindow, matchesDiscount } from "./promotions";
import { computeShippingCents, getSettings, isPaymentMethodEnabled } from "./settings";

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
    discount: o.discountCents / 100,
    promo_code: o.promoCode,
    applied_discounts: o.appliedDiscounts ?? [],
    total: o.totalCents / 100,
    payment_method: o.paymentMethod,
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
  paymentMethod: "cash_on_delivery" | "whish";
  items: { productId: string; color: string; size: string; quantity: number }[];
  promoCode?: string;
};

/**
 * Creates an order with server-side pricing: the client never sets prices.
 * Validates products are active, colors/sizes approved, and preorder
 * capacity. Increments units_sold atomically in one transaction.
 */
export async function createOrder(input: CreateOrderInput) {
  const db = getDb();

  // Re-validated server-side on every order, never trusted from the
  // client: an admin disabling Whish (or COD) mid-session must actually
  // block that method, not just hide it in the checkout UI.
  const settings = await getSettings();
  if (!isPaymentMethodEnabled(settings, input.paymentMethod)) {
    throw new Error("PAYMENT_METHOD_DISABLED");
  }

  // Loaded once per order, outside the transaction — a slightly stale read
  // of "active" automatic discounts is an acceptable trade-off (they're
  // marketing-controlled, not inventory-critical like stock/capacity below).
  const now = new Date();
  const activeDiscounts = (await db.select().from(discounts).where(eq(discounts.active, true))).filter((d) =>
    isWithinWindow(d.startsAt, d.expiresAt, now),
  );

  return db.transaction(async (tx) => {
    const lineItems: OrderLineItem[] = [];
    const appliedDiscounts: { name: string; amountCents: number }[] = [];
    let subtotalCents = 0;
    let automaticDiscountCents = 0;

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

      let best: { discount: (typeof activeDiscounts)[number]; amountCents: number } | null = null;
      for (const d of activeDiscounts) {
        if (!matchesDiscount(d, { productType: product.productType, collectionName: product.collectionName, lineTotalCents })) continue;
        const amountCents = discountAmountCents(d, lineTotalCents);
        if (!best || amountCents > best.amountCents) best = { discount: d, amountCents };
      }
      if (best && best.amountCents > 0) {
        automaticDiscountCents += best.amountCents;
        appliedDiscounts.push({ name: best.discount.nameEn, amountCents: best.amountCents });
      }

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

    const shippingCents = computeShippingCents(settings, subtotalCents);
    const netSubtotalCents = subtotalCents - automaticDiscountCents;

    let promoDiscountCents = 0;
    let appliedPromoCode: string | null = null;
    if (input.promoCode) {
      const [promo] = await tx
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, input.promoCode.trim().toUpperCase()))
        .for("update");
      if (!promo) throw new Error("PROMO_NOT_FOUND");
      if (!promo.active) throw new Error("PROMO_INACTIVE");
      if (!isWithinWindow(promo.startsAt, promo.expiresAt, now)) throw new Error("PROMO_EXPIRED");
      if (promo.maxUses != null && promo.usesCount >= promo.maxUses) throw new Error("PROMO_MAX_USES");
      if (promo.minOrderCents != null && netSubtotalCents < promo.minOrderCents) throw new Error("PROMO_MIN_ORDER");
      promoDiscountCents = discountAmountCents(promo, netSubtotalCents);
      appliedPromoCode = promo.code;
      appliedDiscounts.push({ name: `Promo: ${promo.code}`, amountCents: promoDiscountCents });
      await tx
        .update(promoCodes)
        .set({ usesCount: sql`${promoCodes.usesCount} + 1` })
        .where(eq(promoCodes.id, promo.id));
    }

    const discountCents = automaticDiscountCents + promoDiscountCents;
    const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

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
        discountCents,
        promoCode: appliedPromoCode,
        appliedDiscounts: appliedDiscounts.length ? appliedDiscounts : null,
        totalCents,
        status: "order_received",
        internalStatus: "payment_pending",
        paymentMethod: input.paymentMethod,
        language: input.language,
        isGuest: input.userId == null,
      })
      .$returningId();

    await tx.insert(auditLogs).values({
      actorUserId: input.userId ?? null,
      action: "order.created",
      entity: "order",
      entityId: String(id),
      detail: { itemCount: lineItems.length, totalCents, discountCents },
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

/**
 * Permanently removes an order row (super_admin only — gated in the
 * router, not here). Orders have no hard FK dependents — line items live
 * inline as JSON and `factory_order_items.sourceOrderId` is a plain
 * historical reference column, not a constrained FK — so this is a plain
 * delete. Meant for pre-launch test-data cleanup.
 */
export async function hardDeleteOrder(id: number, actorUserId: number) {
  const db = getDb();
  const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  await db.delete(orders).where(eq(orders.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "order.hard_deleted",
    entity: "order",
    entityId: String(id),
    detail: row ? { order_number: row.orderNumber } : null,
  });
  return { success: true };
}
