import { describe, expect, it } from "vitest";
import { isHoodieStyleName, resolveOrderStyle } from "./lib/garmentStyle";

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
  it("returns undefined for non-hoodie products even when a style is sent", () => {
    expect(resolveOrderStyle("Autumn Hoodie", "tee", HOODIE_STYLES)).toBeUndefined();
    expect(resolveOrderStyle("Autumn Hoodie", "accessory", HOODIE_STYLES)).toBeUndefined();
  });

  it("returns undefined when no style is chosen (legacy clients, product default applies)", () => {
    expect(resolveOrderStyle(undefined, "hoodie", HOODIE_STYLES)).toBeUndefined();
    expect(resolveOrderStyle("", "hoodie", HOODIE_STYLES)).toBeUndefined();
    expect(resolveOrderStyle("   ", "hoodie", HOODIE_STYLES)).toBeUndefined();
  });

  it("accepts a valid hoodie style, case-insensitively, returning the catalog spelling", () => {
    expect(resolveOrderStyle("Autumn Hoodie", "hoodie", HOODIE_STYLES)).toBe("Autumn Hoodie");
    expect(resolveOrderStyle("fleeced winter hoodie", "hoodie", HOODIE_STYLES)).toBe("Fleeced Winter Hoodie");
  });

  it("rejects unknown or non-hoodie style names", () => {
    expect(() => resolveOrderStyle("Regular Fit", "hoodie", HOODIE_STYLES)).toThrow("STYLE_UNAVAILABLE");
    expect(() => resolveOrderStyle("Wool Sweater", "hoodie", HOODIE_STYLES)).toThrow("STYLE_UNAVAILABLE");
  });
});
