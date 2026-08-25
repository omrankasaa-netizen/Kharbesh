import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { createOrder, getOrderById, listOrdersForUser, trackOrder } from "./queries/orders";
import { previewPromoCode, previewCartDiscounts, listActiveCampaigns } from "./queries/promotions";

export const createOrderSchema = z.object({
  email: z.string().email().max(320),
  phone: z.string().min(6).max(40),
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
      return await createOrder({ ...input, userId: ctx.user?.id });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      throw new Error(ERROR_MESSAGES[code] ?? "Could not place the order. Try again.");
    }
  }),

  // Used by the confirmation page right after checkout.
  get: publicQuery
    .input(z.object({ id: z.string().regex(/^\d+$/) }))
    .query(({ input }) => getOrderById(Number(input.id))),

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
});
