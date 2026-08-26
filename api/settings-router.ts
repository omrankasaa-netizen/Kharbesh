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

const contactPatchSchema = z
  .object({
    whatsappNumber: z.string().max(40),
    instagramHandle: z.string().max(60),
    facebookHandle: z.string().max(60),
    email: z.string().max(320),
  })
  .partial();

const loyaltyPatchSchema = z
  .object({
    enabled: z.boolean(),
    khebraThresholdCents: z.number().int().min(0),
    asleeThresholdCents: z.number().int().min(0),
    newKharboushDiscountPercent: z.number().min(0).max(100),
    khebraDiscountPercent: z.number().min(0).max(100),
    asleeDiscountPercent: z.number().min(0).max(100),
    newKharboushFreeShippingCredits: z.number().int().min(0).max(999),
    khebraFreeShippingCredits: z.number().int().min(0).max(999),
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
    shippingFeeCents: z.number().int().min(0),
    freeShippingThresholdCents: z.number().int().min(0),
    contact: contactPatchSchema,
    loyalty: loyaltyPatchSchema,
  })
  .partial();

const ERROR_MESSAGES: Record<string, string> = {
  NO_PAYMENT_METHOD: "At least one payment method must stay enabled.",
  WHISH_HANDLE_REQUIRED: "Add a Whish number/handle before enabling Whish.",
  ASLEE_THRESHOLD_TOO_LOW: "Kharboush Aslee's threshold must be higher than Kharboush Khebra's.",
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
