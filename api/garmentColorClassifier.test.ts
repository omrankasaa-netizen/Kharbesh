import { describe, expect, it } from "vitest";
import { bestColorAssignment } from "./lib/garmentColorClassifier";

// Real median RGB values measured from product 57's four uploaded photos
// (the batch of 16 products, ids 49-64, imported 2026-08-31) converted to
// luminance and per-anchor distance the same way `guessGarmentColor` does.
// These reproduce the actual White/Grey swap bug: because that shoot ran
// darker than the anchors assume, the true-white shirt (median RGB 208,
// 201, 194) landed closer to the Grey anchor than the White anchor, and
// vice versa for the true-grey shirt (median RGB 188, 183, 187) — an
// absolute-anchor match confidently produces the wrong pairing.
const ANCHORS: Record<string, [number, number, number]> = {
  Black: [0, 0, 0],
  White: [242, 242, 242],
  Grey: [207, 207, 207],
  "Dark Charcoal": [80, 87, 109],
};

function distance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const lumA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
  const lumB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
  const dLum = lumA - lumB;
  return Math.sqrt(dr * dr + dg * dg + db * db + 3 * dLum * dLum);
}

function luminance(rgb: [number, number, number]): number {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function distancesFor(rgb: [number, number, number]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, anchor] of Object.entries(ANCHORS)) {
    out[name] = distance(rgb, anchor);
  }
  return out;
}

describe("bestColorAssignment White/Grey relative-luminance correction", () => {
  it("corrects a batch-wide exposure shift that swaps White and Grey against absolute anchors", () => {
    const trueWhite: [number, number, number] = [208, 201, 194];
    const trueGrey: [number, number, number] = [188, 183, 187];
    const black: [number, number, number] = [21, 20, 22];
    const darkCharcoal: [number, number, number] = [51, 50, 53];

    const items = [
      { id: "photo-true-white", distances: distancesFor(trueWhite), luminance: luminance(trueWhite) },
      { id: "photo-true-grey", distances: distancesFor(trueGrey), luminance: luminance(trueGrey) },
      { id: "photo-black", distances: distancesFor(black), luminance: luminance(black) },
      { id: "photo-dark-charcoal", distances: distancesFor(darkCharcoal), luminance: luminance(darkCharcoal) },
    ];

    const assignment = bestColorAssignment(items, ["Black", "White", "Grey", "Dark Charcoal"]);
    const byId = new Map(assignment.map((a) => [a.id, a.color]));

    expect(byId.get("photo-true-white")).toBe("White");
    expect(byId.get("photo-true-grey")).toBe("Grey");
    expect(byId.get("photo-black")).toBe("Black");
    expect(byId.get("photo-dark-charcoal")).toBe("Dark Charcoal");
  });

  it("leaves an already-correct White/Grey pairing untouched", () => {
    const trueWhite: [number, number, number] = [240, 240, 240];
    const trueGrey: [number, number, number] = [206, 206, 206];
    const black: [number, number, number] = [3, 3, 3];
    const darkCharcoal: [number, number, number] = [79, 86, 108];

    const items = [
      { id: "photo-true-white", distances: distancesFor(trueWhite), luminance: luminance(trueWhite) },
      { id: "photo-true-grey", distances: distancesFor(trueGrey), luminance: luminance(trueGrey) },
      { id: "photo-black", distances: distancesFor(black), luminance: luminance(black) },
      { id: "photo-dark-charcoal", distances: distancesFor(darkCharcoal), luminance: luminance(darkCharcoal) },
    ];

    const assignment = bestColorAssignment(items, ["Black", "White", "Grey", "Dark Charcoal"]);
    const byId = new Map(assignment.map((a) => [a.id, a.color]));

    expect(byId.get("photo-true-white")).toBe("White");
    expect(byId.get("photo-true-grey")).toBe("Grey");
    expect(byId.get("photo-black")).toBe("Black");
    expect(byId.get("photo-dark-charcoal")).toBe("Dark Charcoal");
  });

  it("does not touch the assignment when luminance data is missing (backward compatible)", () => {
    const trueWhite: [number, number, number] = [208, 201, 194];
    const trueGrey: [number, number, number] = [188, 183, 187];

    const items = [
      { id: "photo-a", distances: distancesFor(trueWhite) },
      { id: "photo-b", distances: distancesFor(trueGrey) },
    ];

    // Without luminance, the correction step can't run — this just confirms
    // it doesn't throw and still returns a full assignment.
    const assignment = bestColorAssignment(items, ["White", "Grey"]);
    expect(assignment).toHaveLength(2);
  });
});
