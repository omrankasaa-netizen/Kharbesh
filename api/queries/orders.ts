import { getDb } from "./connection";
import { auditLogs, discounts, orders, products, promoCodes, type Order, type OrderLineItem } from "@db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { normalizePhoneToE164, phoneLookupVariants } from "../lib/phone";
import { discountAmountCents, isWithinWindow, matchesDiscount } from "./promotions";
import { computeShippingCents, getSettings, isPaymentMethodEnabled } from "./settings";
import { applyLoyaltyToOrder, tierLabel } from "./loyalty";
import { sendEmail } from "../lib/email";
import { followUpEmail } from "../lib/emailTemplates";

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
    courier_name: o.courierName,
    handed_to_courier_at: o.handedToCourierAt?.toISOString() ?? null,
    cash_collected_at: o.cashCollectedAt?.toISOString() ?? null,
    status: o.status,
    internal_status: o.internalStatus,
    language: o.language,
    is_guest: o.isGuest,
    loyalty_tier_at_order: o.loyaltyTierAtOrder,
    loyalty_discount: o.loyaltyDiscountCents / 100,
    free_shipping_from_loyalty: o.freeShippingFromLoyalty,
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

    const netSubtotalCents = subtotalCents - automaticDiscountCents;

    // Loyalty discount applies on top of automatic per-item discounts, and
    // (below) a promo code applies on top of the loyalty-discounted amount
    // — each layer is itemized into `appliedDiscounts` for transparency.
    // Lifetime spend counts the GROSS pre-discount subtotal.
    const loyaltyResult = await applyLoyaltyToOrder(tx, input.email, netSubtotalCents, subtotalCents, settings);
    if (loyaltyResult.discountCents > 0) {
      appliedDiscounts.push({
        name: `Loyalty: ${tierLabel(loyaltyResult.tierAtOrder)}`,
        amountCents: loyaltyResult.discountCents,
      });
    }
    const netAfterLoyaltyCents = netSubtotalCents - loyaltyResult.discountCents;

    const shippingCents = loyaltyResult.freeShipping ? 0 : computeShippingCents(settings, subtotalCents);

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
      if (promo.minOrderCents != null && netAfterLoyaltyCents < promo.minOrderCents) throw new Error("PROMO_MIN_ORDER");
      promoDiscountCents = discountAmountCents(promo, netAfterLoyaltyCents);
      appliedPromoCode = promo.code;
      appliedDiscounts.push({ name: `Promo: ${promo.code}`, amountCents: promoDiscountCents });
      await tx
        .update(promoCodes)
        .set({ usesCount: sql`${promoCodes.usesCount} + 1` })
        .where(eq(promoCodes.id, promo.id));
    }

    const discountCents = automaticDiscountCents + loyaltyResult.discountCents + promoDiscountCents;
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
        loyaltyTierAtOrder: loyaltyResult.tierAtOrder,
        loyaltyDiscountCents: loyaltyResult.discountCents,
        freeShippingFromLoyalty: loyaltyResult.freeShipping,
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

export type OrderAccessContext = {
  userEmail?: string | null;
  isStaff?: boolean;
  contact?: string;
};

/**
 * Order lookup is no longer an open read: an order row is full PII
 * (name, phone, address), so the caller must either be staff, own the
 * session the order was placed under, or know the email/phone attached
 * to the order — the same bar as guest tracking. Returns null (not an
 * error) when access fails so the two cases are indistinguishable.
 */
export async function getOrderById(id: number, access: OrderAccessContext = {}) {
  const row = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  if (!row) return null;
  if (access.isStaff) return toUiOrder(row);
  if (access.userEmail && row.email.toLowerCase() === access.userEmail.toLowerCase()) {
    return toUiOrder(row);
  }
  const contact = access.contact?.trim();
  if (contact) {
    const normalizedPhone = normalizePhoneToE164(contact);
    if (
      contact.toLowerCase() === row.email.toLowerCase() ||
      contact === row.phone ||
      (normalizedPhone && normalizedPhone === row.phone)
    ) {
      return toUiOrder(row);
    }
  }
  return null;
}

/** Guest order tracking: requires order number AND matching email/phone.
 *  Phones are matched against the raw input plus its E.164 normalization so
 *  both new E.164-stored orders and legacy free-text numbers keep working. */
export async function trackOrder(orderNumber: string, contact: string) {
  const db = getDb();
  const normalized = contact.trim().toLowerCase();
  const row = await db.query.orders.findFirst({
    where: and(
      eq(orders.orderNumber, orderNumber.trim()),
      or(
        eq(sql`lower(${orders.email})`, normalized),
        inArray(orders.phone, phoneLookupVariants(contact)),
      ),
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

export async function listAllOrders(limit = 50, offset = 0) {
  const rows = await getDb()
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toUiOrder);
}

export async function updateOrderStatus(
  id: number,
  status: (typeof orders.status.enumValues)[number],
  actorUserId: number,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [prev] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!prev) return null;

    // Delivered/cancelled drive the internal bookkeeping flag the finance
    // views read — update both columns in one transaction so they can
    // never disagree.
    const internalStatus =
      status === "delivered" ? "paid" : status === "cancelled" ? "cancelled" : prev.internalStatus;
    await tx.update(orders).set({ status, internalStatus, updatedAt: new Date() }).where(eq(orders.id, id));

    // Cancelling hands the reserved units back to the pool so preorder
    // capacity (limited_quantity products) frees up again.
    if (status === "cancelled" && prev.status !== "cancelled") {
      for (const item of prev.items ?? []) {
        const productId = Number(item.productId);
        if (!Number.isInteger(productId) || !(item.quantity > 0)) continue;
        await tx
          .update(products)
          .set({ unitsSold: sql`greatest(0, ${products.unitsSold} - ${item.quantity})` })
          .where(eq(products.id, productId));
      }
    }

    await tx.insert(auditLogs).values({
      actorUserId,
      action: "order.status_updated",
      entity: "order",
      entityId: String(id),
      detail: { status, previous_status: prev.status },
    });
    const [row] = await tx.select().from(orders).where(eq(orders.id, id));
    return row ? toUiOrder(row) : null;
  });
}

/**
 * Records that an order was handed to a courier company for delivery.
 * Re-marking with the same courier is a no-op (safe to retry after a
 * network failure); switching to a different courier after handoff is
 * rejected — that would rewrite delivery history.
 */
export async function markHandedToCourier(id: number, courierName: string, actorUserId: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [prev] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!prev) throw new Error("ORDER_NOT_FOUND");
    if (prev.handedToCourierAt) {
      if (prev.courierName === courierName) return toUiOrder(prev);
      throw new Error("ALREADY_HANDED_TO_COURIER");
    }
    const now = new Date();
    await tx.update(orders).set({ courierName, handedToCourierAt: now, updatedAt: now }).where(eq(orders.id, id));
    await tx.insert(auditLogs).values({
      actorUserId,
      action: "order.handed_to_courier",
      entity: "order",
      entityId: String(id),
      detail: { courier_name: courierName },
    });
    const [row] = await tx.select().from(orders).where(eq(orders.id, id));
    return toUiOrder(row);
  });
}

/**
 * Records that the courier settled this order's COD cash with us. Requires
 * the handoff to have happened first — cash can't arrive from a courier we
 * never gave the parcel to. Re-marking is a no-op.
 */
export async function markCashCollected(id: number, actorUserId: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [prev] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!prev) throw new Error("ORDER_NOT_FOUND");
    if (prev.cashCollectedAt) return toUiOrder(prev);
    if (!prev.handedToCourierAt) throw new Error("HANDOFF_FIRST");
    const now = new Date();
    await tx.update(orders).set({ cashCollectedAt: now, updatedAt: now }).where(eq(orders.id, id));
    await tx.insert(auditLogs).values({
      actorUserId,
      action: "order.cash_collected",
      entity: "order",
      entityId: String(id),
      detail: { courier_name: prev.courierName, totalCents: prev.totalCents },
    });
    const [row] = await tx.select().from(orders).where(eq(orders.id, id));
    return toUiOrder(row);
  });
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

/**
 * Staff-triggered follow-up email (manual button in the admin panel — no
 * automatic delivery timer, per the founder's call). Fetches the raw order
 * row (not the UI-mapped shape) since the email template reads Drizzle
 * field names directly.
 */
export async function sendOrderFollowupEmail(orderId: number) {
  const [row] = await getDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!row) throw new Error("ORDER_NOT_FOUND");

  const { subject, html, text } = followUpEmail(row);
  const result = await sendEmail({ to: row.email, subject, html, text });
  if (!result.ok) throw new Error("EMAIL_SEND_FAILED");
  return { success: true };
}
