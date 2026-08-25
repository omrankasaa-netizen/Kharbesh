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
};

/** Deep-merges persisted JSON on top of defaults so newly added fields (e.g.
 * a settings key shipped after a store was first configured) always have a
 * safe fallback instead of being `undefined` at runtime. */
function withDefaults(value: unknown): SiteSettingsValue {
  const v = (value ?? {}) as Partial<SiteSettingsValue> & { payment?: Partial<SiteSettingsValue["payment"]> };
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    payment: { ...DEFAULT_SETTINGS.payment, ...(v.payment ?? {}) },
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

export type SettingsPatch = Partial<Omit<SiteSettingsValue, "payment">> & {
  payment?: Partial<SiteSettingsValue["payment"]>;
};

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
  };

  if (!next.payment.codEnabled && !next.payment.whishEnabled) {
    throw new Error("NO_PAYMENT_METHOD");
  }
  if (next.payment.whishEnabled && !next.payment.whishHandle.trim()) {
    throw new Error("WHISH_HANDLE_REQUIRED");
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
