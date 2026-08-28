import sharp from "sharp";

/**
 * Heuristic color classifier for the "Import from Drive" tool. Guesses
 * which of the four current storefront garment colors (Black / White /
 * Grey / Antracid) a mockup photo shows, purely from average pixel color —
 * no external AI call, no network round-trip, cheap enough to run on every
 * file in a scan. This is a first guess only: the admin review UI always
 * shows the guess with an editable dropdown, so a wrong or low-confidence
 * call just means one extra click, not a bad import.
 *
 * Anchors match the live `garment_colors` table exactly (checked via the
 * public catalog endpoint on 2026-08-28). If colors are ever renamed or
 * new ones added in the Colors admin page, update ANCHORS to match —
 * nothing here reads the DB automatically.
 */

export type GarmentColorAnchor = {
  name: string;
  rgb: [number, number, number];
};

export const GARMENT_COLOR_ANCHORS: GarmentColorAnchor[] = [
  { name: "Black", rgb: [0, 0, 0] },
  { name: "White", rgb: [242, 242, 242] },
  { name: "Grey", rgb: [207, 207, 207] },
  { name: "Antracid", rgb: [80, 87, 109] },
];

// Above this distance, the average color doesn't look like any of the
// four garment anchors closely enough to trust — likely a raw print
// graphic (transparent/white background) or some other non-mockup file
// that ended up in the folder. Flagged as "uncertain" for manual review
// instead of silently guessing.
const CONFIDENT_MAX_DISTANCE = 70;

function distance(a: [number, number, number], b: [number, number, number]): number {
  // Weight luminance (perceived brightness) more than raw channel
  // difference — that's what actually separates Black/Grey/White/Antracid,
  // since Antracid and Grey share a similar mid-tone lightness but differ
  // in hue (blue-grey vs neutral grey).
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const lumA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
  const lumB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
  const dLum = lumA - lumB;
  return Math.sqrt(dr * dr + dg * dg + db * db + 3 * dLum * dLum);
}

/** Average RGB of the photo's center-torso band — front-facing product
 * mockups (model, shirt filling most of the frame) put the face in the
 * top ~30% and background at the extreme edges, so this band is
 * overwhelmingly fabric pixels in practice. */
async function averageCenterColor(buffer: Buffer): Promise<[number, number, number]> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Could not read image dimensions.");

  const left = Math.round(width * 0.22);
  const top = Math.round(height * 0.32);
  const cropWidth = Math.max(1, Math.round(width * 0.56));
  const cropHeight = Math.max(1, Math.round(height * 0.4));

  const { data, info } = await img
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += channels) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) throw new Error("Empty crop region.");
  return [r / count, g / count, b / count];
}

export type ColorGuess = {
  colorName: string;
  confident: boolean;
  distance: number;
};

export async function guessGarmentColor(buffer: Buffer): Promise<ColorGuess> {
  const avg = await averageCenterColor(buffer);
  let best: GarmentColorAnchor = GARMENT_COLOR_ANCHORS[0];
  let bestDist = Infinity;
  for (const anchor of GARMENT_COLOR_ANCHORS) {
    const d = distance(avg, anchor.rgb);
    if (d < bestDist) {
      bestDist = d;
      best = anchor;
    }
  }
  return { colorName: best.name, confident: bestDist <= CONFIDENT_MAX_DISTANCE, distance: bestDist };
}

/** Small JPEG preview for the review UI — kept tiny so a 40+ design scan
 * response stays light. */
export async function makeThumbnailDataUrl(buffer: Buffer, maxDim = 180): Promise<string> {
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: maxDim, height: maxDim, fit: "inside" })
    .jpeg({ quality: 60 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
