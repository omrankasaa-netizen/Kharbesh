import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { createOrder, getOrderById, listOrdersForUser, trackOrder } from "./queries/orders";

export const createOrderSchema = z.object({
  email: z.string().email().max(320),
  phone: z.string().min(6).max(40),
  fullName: z.string().min(2).max(160),
  shippingAddress: z.string().min(4).max(255),
  city: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  language: z.enum(["en", "ar"]).default("en"),
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
});

const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "One of the items is no longer available.",
  COLOR_UNAVAILABLE: "A selected color is not available for that item.",
  SIZE_UNAVAILABLE: "A selected size is not available for that item.",
  SOLD_OUT: "One of the items just sold out.",
  INVALID_PRODUCT: "Invalid item in cart.",
  INVALID_QUANTITY: "Invalid quantity.",
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
});
