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
});

const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "One of the items is no longer available.",
  COLOR_UNAVAILABLE: "A selected color is not available for that item.",
  SIZE_UNAVAILABLE: "A selected size is not available for that item.",
  SOLD_OUT: "One of the items just sold out.",
  INVALID_PRODUCT: "Invalid item in cart.",
  INVALID_QUANTITY: "Invalid quantity.",
  PROMO_NOT_FOUND: "That promo code doesn't exist.",
  PROMO_INACTIVE: "That promo code is no longer active.",
  PROMO_EXPIRED: "That promo code has expired.",
  PROMO_MAX_USES: "That promo code has reached its usage limit.",
  PROMO_MIN_ORDER: "Your order doesn't meet the minimum for that promo code.",
  PAYMENT_METHOD_DISABLED: "That payment method isn't available right now. Please pick another.",
};

export const orderRouter = createRouter({
  create: publicQuery.input(createOrderSchema).mutation(async ({ ctx, input }) => {
    try {
      const order = await createOrder({ ...input, userId: ctx.user?.id });
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
  get: publicQuery
    .input(z.object({ id: z.string().regex(/^\d+$/), contact: z.string().max(320).optional() }))
    .query(({ ctx, input }) =>
      getOrderById(Number(input.id), {
        userEmail: ctx.user?.email,
        isStaff: ["staff", "admin", "super_admin"].includes(ctx.user?.role ?? ""),
        contact: input.contact,
      }),
    ),

  // Guest tracking: order number + email or phone must both match.
  track: publicQuery
    .input(z.object({ orderNumber: z.string().min(4).max(32), contact: z.string().min(3).max(320) }))
    .query(({ input }) => trackOrder(input.orderNumber, input.contact)),

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
    .query(async ({ input }) => {
      const settings = await getSettings();
      return previewLoyaltyForOrder(input.email, Math.round(input.netSubtotal * 100), settings);
    }),
});
