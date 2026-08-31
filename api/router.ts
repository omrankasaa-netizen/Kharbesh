import { adminRouter } from "./admin-router";
import { authRouter } from "./auth-router";
import { catalogRouter } from "./catalog-router";
import { contactMessagesRouter } from "./contact-router";
import { customRequestRouter } from "./custom-request-router";
import { metaRouter } from "./meta-router";
import { orderRouter } from "./order-router";
import { settingsRouter } from "./settings-router";
import { loyaltyRouter } from "./loyalty-router";
import { newsletterRouter } from "./newsletter-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  catalog: catalogRouter,
  orders: orderRouter,
  customRequests: customRequestRouter,
  contactMessages: contactMessagesRouter,
  newsletter: newsletterRouter,
  settings: settingsRouter,
  admin: adminRouter,
  loyalty: loyaltyRouter,
  meta: metaRouter,
});

export type AppRouter = typeof appRouter;
