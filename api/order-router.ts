import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@db/schema";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { createOrder, getOrderById, listOrdersForUser, trackOrder } from "./queries/orders";
import { previewPromoCode, previewCartDiscounts, listActiveCampaigns } from "./queries/promotions";
import { previewLoyaltyForOrder } from "./queries/loyalty";
import { getSettings } from "./queries/settings";
import { getDb } from "./queries/connection";
import { sendEmail } from "./lib/email";
import { orderConfirmationEmail, adminNewOrderEmail } from "./lib/emailTemplates";
import { env } from "./lib/env";
import { loyaltyPreviewLimiter, orderCreateLimiter, orderLookupLimiter } from "./lib/rateLimit";

/** Fire-and-forget confirmation + staff-notification emails — never lets
 *  an email failure fail the checkout response the customer is waiting on.
 *  The two sends are independent: a customer-email typo (rare, but
 *  possible) shouldn't stop the founder from finding out a new order came
 *  in, and vice versa. */
async function notifyOrderConfirmed(orderId: number) {
  let row: typeof schema.orders.$inferSelect | undefined;
  try {
    [row] = await getDb().select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    if (!row) return;
    const { subject, html, text } = orderConfirmationEmail(row);
    await sendEmail({ to: row.email, subject, html, text });
  } catch (err) {
    console.error("[order] confirmation email failed", err);
  }

  try {
    if (!row) return;
    const { subject, html, text } = adminNewOrderEmail(row);
    await sendEmail({ to: env.adminNotificationEmail, subject, html, text });
  } catch (err) {
    console.error("[order] admin notification email failed", err);
  }
}

export const createOrderSchema = z.object({
  email: z.string().email().max(320),
  // Storefront checkout normalizes to E.164 before submitting (see
  // src/lib/phoneCountries.js) so WhatsApp contact always works.
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "invalid phone"),
  fullName: z.string().min(2).max(160),
  shippingAddress: z.string().min(4).max(255),
  city: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  language: z.enum(["en", "ar"]).default("en"),
  paymentMethod: z.enum(["cash_on_delivery", "whish"]),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^\d+$/),
        color: z.string().min(1).max(80),
        size: z.string().min(1).max(20),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
  promoCode: z.string().max(40).optional(),
  // Honeypot (audit M6): Checkout renders this as a visually hidden,
  // tab-unreachable field that humans never fill — only form-scraping bots
  // do. Filled submissions get a fake-success response WITHOUT an order
  // being created (see the `create` handler). Deliberately NOT max(0):
  // rejecting at schema level would tell the bot it was caught.
  company: z.string().max(200).optional(),
});

/**
 * One generic promo failure message for every "code isn't usable" reason
 * (audit M3): unknown / inactive / expired / not-yet-active / exhausted
 * codes must be indistinguishable, otherwise the public preview endpoint
 * is a valid-code enumeration oracle. PROMO_MIN_ORDER stays distinct on
 * purpose — it only fires for codes that are otherwise valid, so it leaks
 * nothing about whether a code exists.
 */
const PROMO_INVALID_GENERIC = "That promo code is invalid or has expired.";

const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "One of the items is no longer available.",
  COLOR_UNAVAILABLE: "A selected color is not available for that item.",
  SIZE_UNAVAILABLE: "A selected size is not available for that item.",
  SOLD_OUT: "One of the items just sold out.",
  INVALID_PRODUCT: "Invalid item in cart.",
  INVALID_QUANTITY: "Invalid quantity.",
  PROMO_NOT_FOUND: PROMO_INVALID_GENERIC,
  PROMO_INACTIVE: PROMO_INVALID_GENERIC,
  PROMO_EXPIRED: PROMO_INVALID_GENERIC,
  PROMO_MAX_USES: PROMO_INVALID_GENERIC,
  PROMO_MIN_ORDER: "Your order doesn't meet the minimum for that promo code.",
  PAYMENT_METHOD_DISABLED: "That payment method isn't available right now. Please pick another.",
};

/**
 * Audit H1: every guest order-lookup failure (unknown id/number, contact
 * mismatch, per-IP throttle exceeded) throws this SAME message so the
 * endpoints can't be used as an order-existence/contact oracle.
 */
const ORDER_LOOKUP_ERROR = "We couldn't find an order with those details.";

/**
 * Plausible-looking order returned when the checkout honeypot is filled
 * (audit M6). No row is created, no stock is touched, no email is sent —
 * but the response shape matches a real order closely enough that bots
 * can't tell they were filtered. The random high id collides with nothing
 * real; a bot that tries to track it just gets the generic lookup error.
 */
function fakeHoneypotOrder(email: string) {
  const id = 9_000_000 + Math.floor(Math.random() * 999_999);
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return {
    id: String(id),
    order_number: `KH-${stamp}-${suffix}`,
    email,
    status: "order_received",
    created_date: new Date().toISOString(),
  };
}

export const orderRouter = createRouter({
  create: publicQuery.input(createOrderSchema).mutation(async ({ ctx, input }) => {
    // Honeypot first (audit M6): a filled hidden `company` field means a
    // bot. Fake success, create nothing — see fakeHoneypotOrder.
    if (input.company) {
      return fakeHoneypotOrder(input.email);
    }

    // Per-IP throttle on unauthenticated order placement (audit M6): COD
    // orders cost courier + factory money, so floods are capped at 5/hour.
    if (!orderCreateLimiter.check(ctx.clientIp)) {
      throw new Error("Too many orders from this connection, please try again later. / يرجى المحاولة لاحقاً");
    }

    try {
      const { company: _honeypot, ...orderInput } = input;
      const order = await createOrder({ ...orderInput, userId: ctx.user?.id });
      void notifyOrderConfirmed(Number(order.id));
      return order;
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      throw new Error(ERROR_MESSAGES[code] ?? "Could not place the order. Try again.");
    }
  }),

  // Used by the confirmation page right after checkout. Access-gated:
  // staff, the owning session, or a matching email/phone (passed as
  // `contact`, stashed in sessionStorage by checkout) — never a bare id.
  // Audit H1: every failure (unknown id, contact mismatch, throttled)
  // throws the SAME generic error so the endpoint isn't an order-existence
  // oracle, and a per-IP throttle slows serial-id enumeration.
  get: publicQuery
    .input(z.object({ id: z.string().regex(/^\d+$/), contact: z.string().max(320).optional() }))
    .query(async ({ ctx, input }) => {
      if (!orderLookupLimiter.check(ctx.clientIp)) throw new Error(ORDER_LOOKUP_ERROR);
      const order = await getOrderById(Number(input.id), {
        userEmail: ctx.user?.email,
        isStaff: ["staff", "admin", "super_admin"].includes(ctx.user?.role ?? ""),
        contact: input.contact,
      });
      if (!order) throw new Error(ORDER_LOOKUP_ERROR);
      return order;
    }),

  // Guest tracking: order number + email or phone must both match. Same
  // de-oracle treatment as `get` (audit H1) — one generic error for every
  // failure mode, including throttle.
  track: publicQuery
    .input(z.object({ orderNumber: z.string().min(4).max(32), contact: z.string().min(3).max(320) }))
    .query(async ({ ctx, input }) => {
      if (!orderLookupLimiter.check(ctx.clientIp)) throw new Error(ORDER_LOOKUP_ERROR);
      const order = await trackOrder(input.orderNumber, input.contact);
      if (!order) throw new Error(ORDER_LOOKUP_ERROR);
      return order;
    }),

  mine: authedQuery.query(({ ctx }) => listOrdersForUser(ctx.user.email ?? "")),

  previewPromoCode: publicQuery
    .input(z.object({ code: z.string().min(1).max(40), subtotal: z.number().min(0).max(1_000_000) }))
    .query(async ({ input }) => {
      try {
        return await previewPromoCode(input.code, Math.round(input.subtotal * 100));
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        throw new Error(ERROR_MESSAGES[code] ?? "That promo code isn't valid.");
      }
    }),

  // Used by the checkout page so the displayed total matches what createOrder
  // will actually charge: automatic discounts apply silently (no code
  // needed), so without this preview the total shown before "Place order"
  // could be higher than the final charged amount.
  previewCartDiscounts: publicQuery
    .input(
      z
        .array(z.object({ productId: z.string().regex(/^\d+$/), quantity: z.number().int().min(1).max(20) }))
        .min(1)
        .max(30),
    )
    .query(({ input }) => previewCartDiscounts(input)),

  activeCampaigns: publicQuery.query(() => listActiveCampaigns()),

  // Read-only loyalty preview for the Checkout order-summary panel — no
  // DB writes, no tier progression, no free-shipping credit consumption.
  // `netSubtotal` should be the subtotal AFTER automatic per-item
  // discounts (same base createOrder uses), in dollars.
  previewLoyalty: publicQuery
    .input(z.object({ email: z.string().email(), netSubtotal: z.number().min(0).max(1_000_000) }))
    .query(async ({ ctx, input }) => {
      const settings = await getSettings();
      // Audit M5: throttle per IP so this can't be hammered to test whether
      // arbitrary emails hold (higher-tier) loyalty accounts. Over-limit
      // callers silently get the entry-tier preview — same response shape,
      // no "rate limited" tell, and a real shopper's checkout math stays
      // correct for the base tier.
      if (!loyaltyPreviewLimiter.check(ctx.clientIp)) {
        return previewLoyaltyForOrder("", Math.round(input.netSubtotal * 100), settings);
      }
      return previewLoyaltyForOrder(input.email, Math.round(input.netSubtotal * 100), settings);
    }),
});
