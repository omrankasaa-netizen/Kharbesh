import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getSettings, updateSettings } from "./queries/settings";

const paymentPatchSchema = z
  .object({
    codEnabled: z.boolean(),
    whishEnabled: z.boolean(),
    whishHandle: z.string().max(120),
    whishInstructionsEn: z.string().max(2000),
    whishInstructionsAr: z.string().max(2000),
  })
  .partial();

const settingsPatchSchema = z
  .object({
    storeName: z.string().min(1).max(120),
    taglineEn: z.string().max(200),
    taglineAr: z.string().max(200),
    bannerEn: z.string().max(300),
    bannerAr: z.string().max(300),
    bannerEnabled: z.boolean(),
    preordersEnabled: z.boolean(),
    customRequestsEnabled: z.boolean(),
    guestCheckoutEnabled: z.boolean(),
    maintenance: z.boolean(),
    payment: paymentPatchSchema,
  })
  .partial();

const ERROR_MESSAGES: Record<string, string> = {
  NO_PAYMENT_METHOD: "At least one payment method must stay enabled.",
  WHISH_HANDLE_REQUIRED: "Add a Whish number/handle before enabling Whish.",
};

export const settingsRouter = createRouter({
  // Public: the storefront (banner, maintenance gate, checkout payment
  // options, Whish instructions) all read from here. Nothing in this
  // object is sensitive — it's the same marketing/config surface the admin
  // panel edits, so there's no separate "public-safe" projection to keep in
  // sync.
  get: publicQuery.query(() => getSettings()),

  update: adminQuery.input(settingsPatchSchema).mutation(async ({ ctx, input }) => {
    try {
      return await updateSettings(input, ctx.user.id);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      throw new Error(ERROR_MESSAGES[code] ?? "Could not save settings. Try again.");
    }
  }),
});
