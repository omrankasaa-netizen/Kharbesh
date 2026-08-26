import { getDb } from "./connection";
import { loyaltyAccounts, type LoyaltyAccount, type LoyaltyTier } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import type { SiteSettingsValue } from "./settings";

// Accepts either the top-level db handle or a transaction handle (the
// callback param of db.transaction(async (tx) => ...)), since
// applyLoyaltyToOrder runs inside orders.ts's order-creation transaction.
type Db = ReturnType<typeof getDb> | Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// ── Tier ladder ──────────────────────────────────────────────────────────
// New Kharboush (entry) → Kharboush Khebra (>$500 lifetime) → Kharboush
// Aslee (>$1000 lifetime, permanent). Tiers only ever go up automatically;
// an admin override (tierLockedByAdmin) is the only way to hold or move a
// customer against the automatic ladder.

const TIER_RANK: Record<LoyaltyTier, number> = {
  new_kharboush: 0,
  kharboush_khebra: 1,
  kharboush_aslee: 2,
};

export function tierRank(tier: LoyaltyTier): number {
  return TIER_RANK[tier];
}

export function computeTierForSpend(loyalty: SiteSettingsValue["loyalty"], lifetimeSpentCents: number): LoyaltyTier {
  if (lifetimeSpentCents > loyalty.asleeThresholdCents) return "kharboush_aslee";
  if (lifetimeSpentCents > loyalty.khebraThresholdCents) return "kharboush_khebra";
  return "new_kharboush";
}

export type LoyaltyPerks = {
  discountPercent: number;
  /** Free-shipping credits granted on entry into this tier (0 for Aslee — it doesn't need credits, it's always free). */
  creditsGrant: number;
  alwaysFreeShipping: boolean;
};

export function perksForTier(loyalty: SiteSettingsValue["loyalty"], tier: LoyaltyTier): LoyaltyPerks {
  switch (tier) {
    case "kharboush_aslee":
      return { discountPercent: loyalty.asleeDiscountPercent, creditsGrant: 0, alwaysFreeShipping: true };
    case "kharboush_khebra":
      return {
        discountPercent: loyalty.khebraDiscountPercent,
        creditsGrant: loyalty.khebraFreeShippingCredits,
        alwaysFreeShipping: false,
      };
    default:
      return {
        discountPercent: loyalty.newKharboushDiscountPercent,
        creditsGrant: loyalty.newKharboushFreeShippingCredits,
        alwaysFreeShipping: false,
      };
  }
}

const TIER_LABELS: Record<LoyaltyTier, { en: string; ar: string }> = {
  new_kharboush: { en: "New Kharboush", ar: "خربوش جديد" },
  kharboush_khebra: { en: "Kharboush Khebra", ar: "خربوش خبرة" },
  kharboush_aslee: { en: "Kharboush Aslee", ar: "خربوش أصلي" },
};

export function tierLabel(tier: LoyaltyTier, lang: "en" | "ar" = "en"): string {
  return TIER_LABELS[tier][lang];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Idempotent, non-transactional seed used by `upsertUser()` (Google /
 * email-OTP sign-in) so an account exists at "registration" time even
 * before a first order. Never overwrites existing progress — the ON
 * DUPLICATE KEY branch is a harmless no-op touch. Guest checkouts don't
 * go through this path at all; they're seeded directly inside
 * `applyLoyaltyToOrder`'s own create-if-missing logic.
 */
export async function ensureLoyaltyAccountForEmail(emailRaw: string, loyalty: SiteSettingsValue["loyalty"]): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) return;
  const perks = perksForTier(loyalty, "new_kharboush");
  await getDb()
    .insert(loyaltyAccounts)
    .values({
      email,
      tier: "new_kharboush",
      lifetimeSpentCents: 0,
      freeShippingCredits: perks.creditsGrant,
    })
    .onDuplicateKeyUpdate({ set: { email: sql`${loyaltyAccounts.email}` } });
}

export type LoyaltyOrderResult = {
  discountCents: number;
  discountPercent: number;
  freeShipping: boolean;
  tierAtOrder: LoyaltyTier;
  tierAfterOrder: LoyaltyTier;
};

/**
 * The core atomic step, called inside `createOrder()`'s existing
 * transaction (same `tx`). Locks (or creates) the loyalty row for this
 * email, applies the CURRENT tier's discount/free-shipping to this order,
 * then rolls lifetime spend forward and upgrades the tier if warranted —
 * never downgrades, and never touches a row an admin has locked.
 *
 * `baseForDiscountCents` is the net subtotal AFTER automatic per-item
 * discounts (loyalty applies on top of that, promo applies on top of
 * loyalty — see createOrder). `subtotalCentsGross` is the pre-discount
 * subtotal, which is what counts toward lifetime spend.
 */
export async function applyLoyaltyToOrder(
  tx: Db,
  emailRaw: string,
  baseForDiscountCents: number,
  subtotalCentsGross: number,
  settings: SiteSettingsValue,
): Promise<LoyaltyOrderResult> {
  const email = normalizeEmail(emailRaw);
  const loyalty = settings.loyalty;

  if (!loyalty.enabled || !email) {
    return {
      discountCents: 0,
      discountPercent: 0,
      freeShipping: false,
      tierAtOrder: "new_kharboush",
      tierAfterOrder: "new_kharboush",
    };
  }

  let [account] = await tx.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email)).for("update");

  if (!account) {
    const entryPerks = perksForTier(loyalty, "new_kharboush");
    await tx.insert(loyaltyAccounts).values({
      email,
      tier: "new_kharboush",
      lifetimeSpentCents: 0,
      freeShippingCredits: entryPerks.creditsGrant,
    });
    [account] = await tx.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email)).for("update");
  }

  const currentTier = account.tier;
  const currentPerks = perksForTier(loyalty, currentTier);

  const discountCents = Math.round((baseForDiscountCents * currentPerks.discountPercent) / 100);

  let freeShipping: boolean;
  let nextCredits = account.freeShippingCredits;
  if (currentPerks.alwaysFreeShipping) {
    freeShipping = true;
  } else if (account.freeShippingCredits > 0) {
    freeShipping = true;
    nextCredits = account.freeShippingCredits - 1;
  } else {
    freeShipping = false;
  }

  const newLifetimeSpentCents = account.lifetimeSpentCents + subtotalCentsGross;

  let nextTier = currentTier;
  if (!account.tierLockedByAdmin) {
    const computed = computeTierForSpend(loyalty, newLifetimeSpentCents);
    if (tierRank(computed) > tierRank(currentTier)) {
      nextTier = computed;
      // Top up (not additive) to the new tier's configured grant.
      nextCredits = perksForTier(loyalty, nextTier).creditsGrant;
    }
  }

  await tx
    .update(loyaltyAccounts)
    .set({
      tier: nextTier,
      lifetimeSpentCents: newLifetimeSpentCents,
      freeShippingCredits: nextCredits,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyAccounts.email, email));

  return {
    discountCents,
    discountPercent: currentPerks.discountPercent,
    freeShipping,
    tierAtOrder: currentTier,
    tierAfterOrder: nextTier,
  };
}

export type PublicLoyaltyStatus = {
  tier: LoyaltyTier;
  tierLabelEn: string;
  tierLabelAr: string;
  discountPercent: number;
  freeShippingCreditsRemaining: number;
  alwaysFreeShipping: boolean;
};

/**
 * Public-safe read for Profile/Checkout previews. Returns a virtual
 * "New Kharboush" default for emails with no row yet WITHOUT writing to
 * the DB (an anonymous lookup shouldn't create rows), and never exposes
 * raw lifetime-spend cents to keep a plain email lookup from leaking
 * financial history.
 */
export async function getLoyaltyStatusForEmail(emailRaw: string, settings: SiteSettingsValue): Promise<PublicLoyaltyStatus> {
  const email = normalizeEmail(emailRaw);
  const loyalty = settings.loyalty;
  const [account] = email
    ? await getDb().select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email))
    : [];

  const tier: LoyaltyTier = account?.tier ?? "new_kharboush";
  const perks = perksForTier(loyalty, tier);
  const creditsRemaining = account ? account.freeShippingCredits : perks.creditsGrant;

  return {
    tier,
    tierLabelEn: tierLabel(tier, "en"),
    tierLabelAr: tierLabel(tier, "ar"),
    discountPercent: perks.discountPercent,
    freeShippingCreditsRemaining: creditsRemaining,
    alwaysFreeShipping: perks.alwaysFreeShipping,
  };
}

/**
 * Read-only preview of what THIS order would receive under the
 * customer's current tier — no DB writes, no tier progression, no credit
 * consumption. Mirrors the existing previewCartDiscounts/previewPromoCode
 * pattern so Checkout can show an accurate total before "Place order".
 */
export async function previewLoyaltyForOrder(
  emailRaw: string,
  baseForDiscountCents: number,
  settings: SiteSettingsValue,
): Promise<{ discountCents: number; discountPercent: number; freeShippingAvailable: boolean; tier: LoyaltyTier }> {
  const email = normalizeEmail(emailRaw);
  const loyalty = settings.loyalty;
  if (!loyalty.enabled || !email) {
    return { discountCents: 0, discountPercent: 0, freeShippingAvailable: false, tier: "new_kharboush" };
  }
  const [account] = await getDb().select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email));
  const tier: LoyaltyTier = account?.tier ?? "new_kharboush";
  const perks = perksForTier(loyalty, tier);
  const freeShippingAvailable = perks.alwaysFreeShipping || (account ? account.freeShippingCredits > 0 : perks.creditsGrant > 0);
  const discountCents = Math.round((baseForDiscountCents * perks.discountPercent) / 100);
  return { discountCents, discountPercent: perks.discountPercent, freeShippingAvailable, tier };
}

// ── Admin CRUD ───────────────────────────────────────────────────────────

export async function listLoyaltyAccounts(search?: string): Promise<LoyaltyAccount[]> {
  const db = getDb();
  if (search && search.trim()) {
    const needle = `%${search.trim().toLowerCase()}%`;
    return db
      .select()
      .from(loyaltyAccounts)
      .where(sql`lower(${loyaltyAccounts.email}) like ${needle}`)
      .orderBy(sql`${loyaltyAccounts.updatedAt} desc`)
      .limit(200);
  }
  return db.select().from(loyaltyAccounts).orderBy(sql`${loyaltyAccounts.updatedAt} desc`).limit(200);
}

export type AdminLoyaltyPatch = Partial<{
  tier: LoyaltyTier;
  freeShippingCredits: number;
  tierLockedByAdmin: boolean;
  lifetimeSpentCents: number;
  notes: string | null;
}>;

/** Create-if-missing admin update, so support can pre-configure an email before any order exists. */
export async function adminUpdateLoyaltyAccount(
  emailRaw: string,
  patch: AdminLoyaltyPatch,
  loyalty: SiteSettingsValue["loyalty"],
): Promise<LoyaltyAccount> {
  const db = getDb();
  const email = normalizeEmail(emailRaw);
  if (!email) throw new Error("EMAIL_REQUIRED");

  const [existing] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email));
  if (!existing) {
    const entryPerks = perksForTier(loyalty, "new_kharboush");
    await db.insert(loyaltyAccounts).values({
      email,
      tier: "new_kharboush",
      lifetimeSpentCents: 0,
      freeShippingCredits: entryPerks.creditsGrant,
    });
  }

  await db
    .update(loyaltyAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(loyaltyAccounts.email, email));

  const [row] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.email, email));
  return row;
}
