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
  { name: 'Antracid', rgb: [80, 87, 109] },
];

const CONFIDENT_MAX_DISTANCE = 70;

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

/** Average RGB of the photo's center-torso band — matches the backend
 * crop region exactly (22%/32% offset, 56%/40% size). */
async function averageCenterColor(file) {
  const source = await loadDrawable(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('Could not read image dimensions.');

  const left = Math.round(width * 0.22);
  const top = Math.round(height * 0.32);
  const cropWidth = Math.max(1, Math.round(width * 0.56));
  const cropHeight = Math.max(1, Math.round(height * 0.4));

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  const { data } = ctx.getImageData(0, 0, cropWidth, cropHeight);

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (typeof source.close === 'function') source.close();
  if (count === 0) throw new Error('Empty crop region.');
  return [r / count, g / count, b / count];
}

export async function classifyGarmentColor(file) {
  const avg = await averageCenterColor(file);
  let best = GARMENT_COLOR_ANCHORS[0];
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
