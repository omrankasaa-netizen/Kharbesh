import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getLoyaltyStatusForEmail } from "./queries/loyalty";
import { getSettings } from "./queries/settings";

/**
 * Public loyalty surface: status lookup used by the Profile page and the
 * Checkout preview. Admin CRUD (list/update) lives in `admin-router.ts`
 * alongside the promoCodes/discounts/campaigns block, consistent with how
 * the rest of the promotions system is organized. Order-time application
 * (`previewLoyalty`) lives in `order-router.ts` next to the other cart
 * preview endpoints.
 */
export const loyaltyRouter = createRouter({
  myStatus: publicQuery
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const settings = await getSettings();
      return getLoyaltyStatusForEmail(input.email, settings);
    }),
});
