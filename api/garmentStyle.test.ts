import { describe, expect, it } from "vitest";
import { effectiveGarmentType, isHoodieStyleName, resolveOrderStyle } from "./lib/garmentStyle";

const HOODIE_STYLES = ["Heavyweight Hoodie", "Autumn Hoodie", "Fleeced Winter Hoodie"];

describe("isHoodieStyleName", () => {
  it("matches hoodie style names in English and Arabic", () => {
    expect(isHoodieStyleName("Autumn Hoodie")).toBe(true);
    expect(isHoodieStyleName("هودي خريفي")).toBe(true);
    expect(isHoodieStyleName("Regular Fit")).toBe(false);
    expect(isHoodieStyleName("Oversize")).toBe(false);
  });
});

describe("resolveOrderStyle", () => {
  it("returns undefined for accessories even when a style is sent", () => {
    expect(resolveOrderStyle("Autumn Hoodie", "accessory", HOODIE_STYLES)).toBeUndefined();
  });

  it("returns undefined when no style is chosen (product's own garment kept)", () => {
    expect(resolveOrderStyle(undefined, "hoodie", HOODIE_STYLES)).toBeUndefined();
    expect(resolveOrderStyle("", "tee", HOODIE_STYLES)).toBeUndefined();
    expect(resolveOrderStyle("   ", "hoodie", HOODIE_STYLES)).toBeUndefined();
  });

  it("accepts a valid hoodie style, case-insensitively, returning the catalog spelling", () => {
    expect(resolveOrderStyle("Autumn Hoodie", "hoodie", HOODIE_STYLES)).toBe("Autumn Hoodie");
    expect(resolveOrderStyle("fleeced winter hoodie", "hoodie", HOODIE_STYLES)).toBe("Fleeced Winter Hoodie");
  });

  it("accepts a hoodie style on a TEE product (cross-garment pricing)", () => {
    expect(resolveOrderStyle("Autumn Hoodie", "tee", HOODIE_STYLES)).toBe("Autumn Hoodie");
  });

  it("rejects unknown style names, never silently swaps", () => {
    expect(() => resolveOrderStyle("Regular Fit", "hoodie", HOODIE_STYLES)).toThrow("STYLE_UNAVAILABLE");
    expect(() => resolveOrderStyle("Wool Sweater", "tee", HOODIE_STYLES)).toThrow("STYLE_UNAVAILABLE");
  });
});

describe("effectiveGarmentType", () => {
  it("a hoodie style chosen on a tee product makes the factory garment a hoodie", () => {
    expect(effectiveGarmentType("tee", "Autumn Hoodie")).toBe("hoodie");
    expect(effectiveGarmentType("tee", "هودي خريفي")).toBe("hoodie");
  });

  it("no style keeps the product's own type", () => {
    expect(effectiveGarmentType("tee", undefined)).toBe("tee");
    expect(effectiveGarmentType("hoodie", undefined)).toBe("hoodie");
    expect(effectiveGarmentType("accessory", undefined)).toBe("accessory");
  });
});
