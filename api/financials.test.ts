import { describe, expect, it } from "vitest";
import { validateProfitShares } from "./queries/financials";

describe("validateProfitShares", () => {
  it("accepts a valid 2-partner split totalling 100", () => {
    expect(
      validateProfitShares([
        { name: "Omar", percent: 60 },
        { name: "Sara", percent: 40 },
      ]),
    ).toBeNull();
  });

  it("accepts decimal percents that total exactly 100 (float dust tolerated)", () => {
    expect(
      validateProfitShares([
        { name: "A", percent: 33.3 },
        { name: "B", percent: 33.3 },
        { name: "C", percent: 33.4 },
      ]),
    ).toBeNull();
  });

  it("rejects splits that do not total exactly 100", () => {
    expect(
      validateProfitShares([
        { name: "Omar", percent: 60 },
        { name: "Sara", percent: 30 },
      ]),
    ).toBe("SHARES_MUST_TOTAL_100");
    expect(validateProfitShares([{ name: "Omar", percent: 101 }])).toBe("INVALID_SHARES");
  });

  it("rejects empty splits, more than 4 partners, and bad shapes", () => {
    expect(validateProfitShares([])).toBe("INVALID_SHARES");
    expect(
      validateProfitShares([
        { name: "A", percent: 25 },
        { name: "B", percent: 25 },
        { name: "C", percent: 25 },
        { name: "D", percent: 25 },
        { name: "E", percent: 0 },
      ]),
    ).toBe("INVALID_SHARES");
    expect(validateProfitShares([{ name: "", percent: 100 }])).toBe("INVALID_SHARES");
    expect(validateProfitShares([{ name: "A", percent: -1 }])).toBe("INVALID_SHARES");
    expect(validateProfitShares([{ name: "A", percent: Number.NaN }])).toBe("INVALID_SHARES");
  });
});
