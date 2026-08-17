import { adminRouter } from "./admin-router";
import { authRouter } from "./auth-router";
import { catalogRouter } from "./catalog-router";
import { customRequestRouter } from "./custom-request-router";
import { orderRouter } from "./order-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  catalog: catalogRouter,
  orders: orderRouter,
  customRequests: customRequestRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
