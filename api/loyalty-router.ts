import { createRouter, authedQuery } from "./middleware";
import { getLoyaltyStatusForEmail } from "./queries/loyalty";
import { getSettings } from "./queries/settings";

/**
 * Loyalty status surface. Admin CRUD (list/update) lives in
 * `admin-router.ts` alongside the promoCodes/discounts/campaigns block,
 * consistent with how the rest of the promotions system is organized.
 * Order-time application (`previewLoyalty`) lives in `order-router.ts`
 * next to the other cart preview endpoints.
 *
 * Audit M5: this used to be a PUBLIC lookup by arbitrary email, which
 * revealed whether someone is a customer and their tier/credits. It's now
 * authenticated and scoped to the caller's own session email — the only
 * caller (Profile page) is signed in by definition, and guest checkout
 * uses the separate read-only `orders.previewLoyalty` (which is throttled
 * and never leaks credits).
 */
export const loyaltyRouter = createRouter({
  myStatus: authedQuery.query(async ({ ctx }) => {
    const settings = await getSettings();
    return getLoyaltyStatusForEmail(ctx.user.email ?? "", settings);
  }),
});
