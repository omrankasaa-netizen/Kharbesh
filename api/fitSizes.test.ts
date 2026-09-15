import { describe, expect, it } from "vitest";
import { factorySizeFor, normalizeFit, toInternalSize, INTERNAL_TEE_SIZES } from "./lib/fitSizes";

/**
 * The tee fit contract: customers pick S, M, L, XL, XXL in one of two cuts
 * (regular | oversize); the factory stocks each cut in three internal
 * sizes — S/M, L/XL, XXL. Every other garment type has no fit at all.
 */
describe("fitSizes", () => {
  it("collapses adjacent customer sizes onto one internal blank size", () => {
    expect(toInternalSize("S")).toBe("S/M");
    expect(toInternalSize("M")).toBe("S/M");
    expect(toInternalSize("L")).toBe("L/XL");
    expect(toInternalSize("XL")).toBe("L/XL");
    expect(toInternalSize("XXL")).toBe("XXL");
  });

  it("is case/whitespace tolerant and accepts 2XL as an alias", () => {
    expect(toInternalSize(" s ")).toBe("S/M");
    expect(toInternalSize("xl")).toBe("L/XL");
    expect(toInternalSize("2XL")).toBe("XXL");
  });

  it("passes already-internal sizes through unchanged", () => {
    for (const s of INTERNAL_TEE_SIZES) expect(toInternalSize(s)).toBe(s);
  });

  it("never invents a group for unknown sizes — passes them through", () => {
    expect(toInternalSize("3XL")).toBe("3XL");
  });

  it("maps factory size only for tees, leaving other garments untouched", () => {
    expect(factorySizeFor("tee", "M")).toBe("S/M");
    expect(factorySizeFor("hoodie", "M")).toBe("M");
    expect(factorySizeFor("accessory", "OS")).toBe("OS");
  });

  it("normalizes fits: oversize only when explicit, tees only", () => {
    expect(normalizeFit("oversize", "tee")).toBe("oversize");
    expect(normalizeFit("regular", "tee")).toBe("regular");
    expect(normalizeFit(undefined, "tee")).toBe("regular");
    expect(normalizeFit("garbage", "tee")).toBe("regular");
    // Fits never leak onto non-tee garments, even if a client sends one.
    expect(normalizeFit("oversize", "hoodie")).toBe("regular");
    expect(normalizeFit("oversize", "accessory")).toBe("regular");
    expect(normalizeFit("oversize")).toBe("oversize");
  });
});
