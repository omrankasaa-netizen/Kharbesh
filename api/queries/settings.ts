import { getDb } from "./connection";
import { auditLogs, siteSettings } from "@db/schema";
import { eq } from "drizzle-orm";

const SETTINGS_KEY = "general";

export type SiteSettingsValue = {
  storeName: string;
  taglineEn: string;
  taglineAr: string;
  bannerEn: string;
  bannerAr: string;
  bannerEnabled: boolean;
  preordersEnabled: boolean;
  customRequestsEnabled: boolean;
  guestCheckoutEnabled: boolean;
  maintenance: boolean;
  payment: {
    codEnabled: boolean;
    whishEnabled: boolean;
    /** Whish phone number / handle customers send payment to. */
    whishHandle: string;
    whishInstructionsEn: string;
    whishInstructionsAr: string;
  };
  /** Flat shipping fee applied to every Lebanon order, in cents. */
  shippingFeeCents: number;
  /** Order subtotal (cents) at or above which shipping becomes free. */
  freeShippingThresholdCents: number;
  contact: {
    /** Digits only, country code included, e.g. "96176465367". */
    whatsappNumber: string;
    instagramHandle: string;
    facebookHandle: string;
    email: string;
  };
  /** Controllable loyalty tier program — thresholds, discounts, and
   * free-shipping credit grants are all admin-editable from Settings so
   * the whole ladder can be tuned without a code change. */
  loyalty: {
    enabled: boolean;
    /** Lifetime spend (cents) at/above which a customer becomes Kharboush Khebra. */
    khebraThresholdCents: number;
    /** Lifetime spend (cents) at/above which a customer becomes Kharboush Aslee. */
    asleeThresholdCents: number;
    newKharboushDiscountPercent: number;
    khebraDiscountPercent: number;
    asleeDiscountPercent: number;
    /** Free-shipping credits granted on entry / upgrade to this tier. Aslee
     * ignores its credit count — it's always free, permanently. */
    newKharboushFreeShippingCredits: number;
    khebraFreeShippingCredits: number;
  };
};

export const DEFAULT_SETTINGS: SiteSettingsValue = {
  storeName: "Kharbesh",
  taglineEn: "Tees with the things people say every day.",
  taglineAr: "تيشيرتات عليها الكلام يلي بيتقال كل يوم.",
  bannerEn: "",
  bannerAr: "",
  bannerEnabled: false,
  preordersEnabled: true,
  customRequestsEnabled: true,
  guestCheckoutEnabled: true,
  maintenance: false,
  payment: {
    codEnabled: true,
    whishEnabled: false,
    whishHandle: "",
    whishInstructionsEn: "",
    whishInstructionsAr: "",
  },
  shippingFeeCents: 400,
  freeShippingThresholdCents: 10000,
  contact: {
    whatsappNumber: "96176465367",
    instagramHandle: "kharbeshh",
    facebookHandle: "Kharbeshh",
    email: "",
  },
  loyalty: {
    enabled: true,
    khebraThresholdCents: 50000, // $500
    asleeThresholdCents: 100000, // $1000
    newKharboushDiscountPercent: 2,
    khebraDiscountPercent: 4,
    asleeDiscountPercent: 5,
    newKharboushFreeShippingCredits: 1,
    khebraFreeShippingCredits: 2,
  },
};

/** Deep-merges persisted JSON on top of defaults so newly added fields (e.g.
 * a settings key shipped after a store was first configured) always have a
 * safe fallback instead of being `undefined` at runtime. */
function withDefaults(value: unknown): SiteSettingsValue {
  const v = (value ?? {}) as Partial<SiteSettingsValue> & {
    payment?: Partial<SiteSettingsValue["payment"]>;
    contact?: Partial<SiteSettingsValue["contact"]>;
    loyalty?: Partial<SiteSettingsValue["loyalty"]>;
  };
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    payment: { ...DEFAULT_SETTINGS.payment, ...(v.payment ?? {}) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(v.contact ?? {}) },
    loyalty: { ...DEFAULT_SETTINGS.loyalty, ...(v.loyalty ?? {}) },
  };
}

export async function getSettings(): Promise<SiteSettingsValue> {
  const db = getDb();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY));
  return withDefaults(row?.value);
}

/** True if the given payment method is currently accepted at checkout. */
export function isPaymentMethodEnabled(
  settings: SiteSettingsValue,
  method: "cash_on_delivery" | "whish",
) {
  return method === "whish" ? settings.payment.whishEnabled : settings.payment.codEnabled;
}

export type SettingsPatch = Partial<Omit<SiteSettingsValue, "payment" | "contact" | "loyalty">> & {
  payment?: Partial<SiteSettingsValue["payment"]>;
  contact?: Partial<SiteSettingsValue["contact"]>;
  loyalty?: Partial<SiteSettingsValue["loyalty"]>;
};

/** Shipping fee (cents) for a given subtotal, per current settings — free
 * above the configured threshold, flat fee otherwise. Used both at order
 * creation (server truth) and for client-side display. */
export function computeShippingCents(settings: SiteSettingsValue, subtotalCents: number): number {
  if (subtotalCents >= settings.freeShippingThresholdCents) return 0;
  return settings.shippingFeeCents;
}

/**
 * Merges `patch` on top of the currently persisted settings and writes the
 * result back. Rejects a change that would leave checkout with zero
 * accepted payment methods — that would silently brick every order, so it's
 * blocked here rather than trusted to admin-panel UI alone.
 */
export async function updateSettings(patch: SettingsPatch, actorUserId: number): Promise<SiteSettingsValue> {
  const db = getDb();
  const current = await getSettings();
  const next: SiteSettingsValue = {
    ...current,
    ...patch,
    payment: { ...current.payment, ...(patch.payment ?? {}) },
    contact: { ...current.contact, ...(patch.contact ?? {}) },
    loyalty: { ...current.loyalty, ...(patch.loyalty ?? {}) },
  };

  if (!next.payment.codEnabled && !next.payment.whishEnabled) {
    throw new Error("NO_PAYMENT_METHOD");
  }
  if (next.payment.whishEnabled && !next.payment.whishHandle.trim()) {
    throw new Error("WHISH_HANDLE_REQUIRED");
  }
  if (next.loyalty.asleeThresholdCents <= next.loyalty.khebraThresholdCents) {
    throw new Error("ASLEE_THRESHOLD_TOO_LOW");
  }

  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value: next })
    .onDuplicateKeyUpdate({ set: { value: next, updatedAt: new Date() } });

  await db.insert(auditLogs).values({
    actorUserId,
    action: "settings.updated",
    entity: "site_settings",
    entityId: SETTINGS_KEY,
    detail: { patch },
  });

  return next;
}
