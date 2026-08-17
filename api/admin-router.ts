import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { listUsers, updateProduct, listAuditLogs } from "./queries/admin";
import { listAllProducts } from "./queries/catalog";
import { listAllOrders, updateOrderStatus } from "./queries/orders";
import {
  listAllCustomRequests,
  updateCustomRequestStatus,
} from "./queries/customRequests";

const idParam = z.string().regex(/^\d+$/, "Invalid id");

export const adminRouter = createRouter({
  /** Full catalog including drafts. */
  productsAll: adminQuery.query(() => listAllProducts()),

  /** Partial product update; fields arrive in the UI's snake_case shape. */
  updateProduct: adminQuery
    .input(
      z.object({
        id: idParam,
        data: z.object({
          status: z.enum(["active", "draft", "archived"]).optional(),
          preorder_capacity: z.number().int().min(0).max(1_000_000).nullable().optional(),
          units_sold: z.number().int().min(0).max(1_000_000).optional(),
          price: z.number().min(0).max(1_000_000).optional(),
        }),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateProduct(Number(input.id), input.data, ctx.user.id),
    ),

  orders: adminQuery.query(() => listAllOrders()),

  updateOrderStatus: adminQuery
    .input(
      z.object({
        id: idParam,
        status: z.enum([
          "order_received",
          "preorder_confirmed",
          "in_production",
          "being_printed",
          "preparing_shipment",
          "on_the_way",
          "delivered",
          "needs_attention",
        ]),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateOrderStatus(Number(input.id), input.status, ctx.user.id),
    ),

  customRequests: adminQuery.query(() => listAllCustomRequests()),

  updateCustomRequestStatus: adminQuery
    .input(
      z.object({
        id: idParam,
        status: z.enum([
          "new_request",
          "review",
          "quote_sent",
          "deposit_paid",
          "designing",
          "customer_review",
          "revision",
          "approved",
          "balance_due",
          "production",
          "shipped",
          "closed",
        ]),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateCustomRequestStatus(Number(input.id), input.status, ctx.user.id),
    ),

  users: adminQuery.query(() => listUsers()),

  auditLogs: adminQuery.query(() => listAuditLogs()),
});
