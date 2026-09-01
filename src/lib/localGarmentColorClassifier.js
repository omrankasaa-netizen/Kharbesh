/**
 * Client-side (canvas-based) mirror of api/lib/garmentColorClassifier.ts —
 * used by the "Local Folder Import" admin tool so color-guessing can run
 * entirely in the browser against files picked from the founder's own
 * computer, with no server round-trip and no Google Drive access needed.
 * Anchors/weights/threshold are kept identical to the backend version so
 * behavior matches exactly if a Drive-based path is ever revisited.
 */

export const GARMENT_COLOR_ANCHORS = [
  { name: 'Black', rgb: [0, 0, 0] },
  { name: 'White', rgb: [242, 242, 242] },
  { name: 'Grey', rgb: [207, 207, 207] },
  { name: 'Dark Charcoal', rgb: [80, 87, 109] },
];

const CONFIDENT_MAX_DISTANCE = 70;

/** Looser than CONFIDENT_MAX_DISTANCE — used only to flag a final assigned
 * match as "worth a quick look" in the review UI, never to reject it. */
export const REVIEW_SUGGESTED_DISTANCE = 100;

function distance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const lumA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
  const lumB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
  const dLum = lumA - lumB;
  return Math.sqrt(dr * dr + dg * dg + db * db + 3 * dLum * dLum);
}

async function loadDrawable(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* some formats/browsers reject createImageBitmap — fall back below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Median RGB of the torso's left/right side strips — matches the backend
 * sampling strategy exactly. Deliberately avoids the center-chest band
 * where a printed graphic almost always sits: averaging that band let
 * bold dark print text drag a genuinely white shirt's color toward a
 * darker anchor (observed misclassifying white shirts as "Dark Charcoal").
 * Side strips stay plain fabric on virtually every mockup style, and the
 * per-channel MEDIAN (not mean) means a stray print/shadow pixel can't
 * skew the result unless it covers most of the sampled area. */
async function averageCenterColor(file) {
  const source = await loadDrawable(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('Could not read image dimensions.');

  const top = Math.round(height * 0.32);
  const stripHeight = Math.max(1, Math.round(height * 0.4));
  const stripWidth = Math.max(1, Math.round(width * 0.14));
  const leftStripX = Math.round(width * 0.08);
  const rightStripX = Math.round(width * 0.78);

  const canvas = document.createElement('canvas');
  canvas.width = stripWidth * 2;
  canvas.height = stripHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, leftStripX, top, stripWidth, stripHeight, 0, 0, stripWidth, stripHeight);
  ctx.drawImage(source, rightStripX, top, stripWidth, stripHeight, stripWidth, 0, stripWidth, stripHeight);
  const { data } = ctx.getImageData(0, 0, stripWidth * 2, stripHeight);

  const rs = [];
  const gs = [];
  const bs = [];
  for (let i = 0; i < data.length; i += 4) {
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }
  if (typeof source.close === 'function') source.close();
  if (rs.length === 0) throw new Error('Empty crop region.');
  return [median(rs), median(gs), median(bs)];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Returns the distance from this photo's sampled color to EVERY anchor
 * (not just the closest one). A folder-wide assignment step needs the full
 * distance table to pick the best overall pairing between the 4 colors and
 * the photos in a design's folder — picking only each photo's single
 * best-guess color (the old behavior) meant two photos that both leaned
 * toward the same anchor would collide, leaving the actually-open color
 * unfilled even though one of those photos was a decent match for it.
 */
export async function classifyGarmentColor(file) {
  const avg = await averageCenterColor(file);
  const distances = {};
  let best = GARMENT_COLOR_ANCHORS[0];
  let bestDist = Infinity;
  for (const anchor of GARMENT_COLOR_ANCHORS) {
    const d = distance(avg, anchor.rgb);
    distances[anchor.name] = d;
    if (d < bestDist) {
      bestDist = d;
      best = anchor;
    }
  }
  return { colorName: best.name, confident: bestDist <= CONFIDENT_MAX_DISTANCE, distance: bestDist, distances };
}

/**
 * Finds the folder-wide pairing between a set of colors and a set of photos
 * that minimizes the TOTAL distance across all pairs — i.e. a true min-cost
 * assignment, not a greedy "take the globally smallest single pair first"
 * heuristic. Greedy is provably suboptimal whenever two anchors sit close
 * together (White at 242 and Grey at 207 are only 35 RGB units apart): if a
 * true-Grey photo happens to read slightly closer to the White anchor than
 * the true-White photo does, greedy steals the White slot for the Grey photo
 * first (that's the single smallest distance in the whole list), leaving the
 * true-White photo mismatched even though swapping the two would have a
 * lower TOTAL cost. Brute-forcing every permutation is fine here — at most 4
 * colors and a handful of photos per design folder, so at most a few
 * thousand permutations in the worst case.
 *
 * @param {Array<{id: string, distances: Record<string, number>|null}>} items
 * @param {string[]} colorNames
 * @returns {Array<{id: string, color: string, distance: number}>}
 */
export function bestColorAssignment(items, colorNames) {
  let usable = items.filter((it) => it.distances);
  const m = colorNames.length;
  if (usable.length === 0 || m === 0) return [];
  // Safety cap so this never blows up if a folder unexpectedly has far more
  // photos than colors.
  const MAX_CANDIDATES = 12;
  if (usable.length > MAX_CANDIDATES) {
    usable = [...usable]
      .sort((a, b) => Math.min(...Object.values(a.distances)) - Math.min(...Object.values(b.distances)))
      .slice(0, MAX_CANDIDATES);
  }
  const n = usable.length;

  let bestPairs = [];
  let bestCost = Infinity;

  function permute(arr, k, cb) {
    const used = new Array(arr.length).fill(false);
    const current = [];
    function backtrack() {
      if (current.length === k) {
        cb(current.slice());
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.push(arr[i]);
        backtrack();
        current.pop();
        used[i] = false;
      }
    }
    backtrack();
  }

  if (n <= m) {
    const colorIdx = colorNames.map((_, i) => i);
    permute(colorIdx, n, (perm) => {
      let cost = 0;
      for (let i = 0; i < n; i++) cost += usable[i].distances[colorNames[perm[i]]];
      if (cost < bestCost) {
        bestCost = cost;
        bestPairs = perm.map((cIdx, i) => ({
          id: usable[i].id,
          color: colorNames[cIdx],
          distance: usable[i].distances[colorNames[cIdx]],
        }));
      }
    });
  } else {
    const itemIdx = usable.map((_, i) => i);
    permute(itemIdx, m, (perm) => {
      let cost = 0;
      for (let j = 0; j < m; j++) cost += usable[perm[j]].distances[colorNames[j]];
      if (cost < bestCost) {
        bestCost = cost;
        bestPairs = perm.map((itemI, j) => ({
          id: usable[itemI].id,
          color: colorNames[j],
          distance: usable[itemI].distances[colorNames[j]],
        }));
      }
    });
  }
  return bestPairs;
}
