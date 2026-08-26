import { describe, expect, it } from "vitest";
import {
  discountAmountCents,
  isWithinWindow,
  matchesDiscount,
  pickAutomaticDiscount,
  type DiscountRow,
} from "./queries/promotions";
import { computeTierForSpend, perksForTier, tierLabel, tierRank } from "./queries/loyalty";
import type { SiteSettingsValue } from "./queries/settings";

/**
 * Unit tests for the money math the checkout depends on: discount amounts,
 * discount matching/stacking, and loyalty tier computation. These run
 * without a database — pure functions only.
 */

const loyaltySettings: SiteSettingsValue["loyalty"] = {
  enabled: true,
  khebraThresholdCents: 50000, // $500
  asleeThresholdCents: 100000, // $1000
  newKharboushDiscountPercent: 2,
  khebraDiscountPercent: 4,
  asleeDiscountPercent: 5,
  newKharboushFreeShippingCredits: 1,
  khebraFreeShippingCredits: 2,
};

describe("discountAmountCents", () => {
  it("computes percent discounts rounded to the nearest cent", () => {
    expect(discountAmountCents({ type: "percent", value: 10 }, 3500)).toBe(350);
    expect(discountAmountCents({ type: "percent", value: 15 }, 3333)).toBe(500); // 499.95 → 500
    expect(discountAmountCents({ type: "percent", value: 100 }, 2000)).toBe(2000);
  });

  it("never lets a fixed discount exceed the line total", () => {
    expect(discountAmountCents({ type: "fixed", value: 500 }, 3000)).toBe(500);
    expect(discountAmountCents({ type: "fixed", value: 5000 }, 3000)).toBe(3000);
  });

  it("handles zero bases without going negative", () => {
    expect(discountAmountCents({ type: "percent", value: 50 }, 0)).toBe(0);
    expect(discountAmountCents({ type: "fixed", value: 500 }, 0)).toBe(0);
  });
});

describe("matchesDiscount", () => {
  const base = { appliesTo: "all", appliesValue: null } as DiscountRow;
  const line = { productType: "tee", collectionName: "Kharbesh Quotes", lineTotalCents: 3500 };

  it("matches everything when applies_to is 'all'", () => {
    expect(matchesDiscount(base, line)).toBe(true);
  });

  it("matches product types exactly", () => {
    const d = { ...base, appliesTo: "product_type", appliesValue: "tee" } as DiscountRow;
    expect(matchesDiscount(d, line)).toBe(true);
    expect(matchesDiscount({ ...d, appliesValue: "hoodie" }, line)).toBe(false);
  });

  it("matches collections exactly (no fuzzy/partial matching)", () => {
    const d = { ...base, appliesTo: "collection", appliesValue: "Kharbesh Quotes" } as DiscountRow;
    expect(matchesDiscount(d, line)).toBe(true);
    expect(matchesDiscount({ ...d, appliesValue: "kharbesh quotes" }, line)).toBe(false);
    expect(matchesDiscount({ ...d, appliesValue: "Kharbesh" }, line)).toBe(false);
  });
});

describe("pickAutomaticDiscount", () => {
  const line = { productType: "tee", collectionName: "Quotes", lineTotalCents: 3500 };
  const mk = (over: Partial<DiscountRow>) => ({ appliesTo: "all", appliesValue: null, ...over } as DiscountRow);

  it("returns null when nothing matches", () => {
    const d = mk({ appliesTo: "product_type", appliesValue: "hoodie", type: "percent", value: 50 });
    expect(pickAutomaticDiscount([d], line)).toBeNull();
  });

  it("picks the largest discount, not the first match", () => {
    const small = mk({ type: "percent", value: 10 }); // 350
    const big = mk({ type: "percent", value: 20 }); // 700
    const fixed = mk({ type: "fixed", value: 650 }); // 650
    const best = pickAutomaticDiscount([small, big, fixed], line);
    expect(best?.amountCents).toBe(700);
    expect(best?.discount).toBe(big);
  });
});

describe("isWithinWindow", () => {
  const now = new Date("2026-08-27T12:00:00Z");

  it("treats null bounds as open", () => {
    expect(isWithinWindow(null, null, now)).toBe(true);
  });

  it("respects start and end bounds", () => {
    expect(isWithinWindow(new Date("2026-08-28T00:00:00Z"), null, now)).toBe(false);
    expect(isWithinWindow(null, new Date("2026-08-26T00:00:00Z"), now)).toBe(false);
    expect(isWithinWindow(new Date("2026-08-26T00:00:00Z"), new Date("2026-08-28T00:00:00Z"), now)).toBe(true);
  });
});

describe("computeTierForSpend", () => {
  it("starts everyone at new_kharboush", () => {
    expect(computeTierForSpend(loyaltySettings, 0)).toBe("new_kharboush");
  });

  it("uses strict thresholds — exactly $500 is NOT khebra yet", () => {
    expect(computeTierForSpend(loyaltySettings, 50000)).toBe("new_kharboush");
    expect(computeTierForSpend(loyaltySettings, 50001)).toBe("kharboush_khebra");
  });

  it("reaches aslee strictly above $1000", () => {
    expect(computeTierForSpend(loyaltySettings, 100000)).toBe("kharboush_khebra");
    expect(computeTierForSpend(loyaltySettings, 100001)).toBe("kharboush_aslee");
  });
});

describe("perksForTier / tierRank / tierLabel", () => {
  it("orders tiers new < khebra < aslee", () => {
    expect(tierRank("new_kharboush")).toBeLessThan(tierRank("kharboush_khebra"));
    expect(tierRank("kharboush_khebra")).toBeLessThan(tierRank("kharboush_aslee"));
  });

  it("grants the configured discount percent per tier", () => {
    expect(perksForTier(loyaltySettings, "new_kharboush").discountPercent).toBe(2);
    expect(perksForTier(loyaltySettings, "kharboush_khebra").discountPercent).toBe(4);
    expect(perksForTier(loyaltySettings, "kharboush_aslee").discountPercent).toBe(5);
  });

  it("aslee always ships free and needs no credits", () => {
    const perks = perksForTier(loyaltySettings, "kharboush_aslee");
    expect(perks.alwaysFreeShipping).toBe(true);
    expect(perks.creditsGrant).toBe(0);
  });

  it("has a human label per tier", () => {
    expect(tierLabel("kharboush_aslee")).toBeTruthy();
    expect(tierLabel("new_kharboush", "ar")).toBeTruthy();
  });
});
