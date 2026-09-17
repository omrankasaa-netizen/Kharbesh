import { describe, expect, it } from "vitest";
import { metaTrackLimiter, metaPurchaseLimiter } from "./lib/rateLimit";

/**
 * Guards the CGNAT sizing rule on the Meta CAPI limiters: Lebanese mobile
 * carriers place many real shoppers behind one shared egress IP, so the
 * per-IP budget must absorb a busy minute of SHARED real traffic. An
 * over-limit drop silently deletes a server event (Events Manager: "pixel
 * events not covered by Conversions API") — lowering these limits is a
 * tracking-coverage regression.
 */

describe("Meta CAPI rate limits (CGNAT-safe)", () => {
  it("track: absorbs a busy shared-IP minute without dropping real events", () => {
    // 300 events/min from one IP ≈ 20–30 concurrent real shoppers browsing
    // (landing PageView + ViewContent + route changes each).
    const ip = "203.0.113.10";
    for (let i = 0; i < 300; i++) {
      expect(metaTrackLimiter.check(ip)).toBe(true);
    }
  });

  it("track: still bounds abuse beyond the budget", () => {
    const ip = "203.0.113.11";
    let last = true;
    for (let i = 0; i < 700; i++) last = metaTrackLimiter.check(ip);
    expect(last).toBe(false);
  });

  it("purchase: absorbs a campaign-minute burst on a shared IP, then caps", () => {
    const ip = "203.0.113.12";
    for (let i = 0; i < 60; i++) {
      expect(metaPurchaseLimiter.check(ip)).toBe(true);
    }
    expect(metaPurchaseLimiter.check(ip)).toBe(false);
  });
});
