import { getDb } from "./connection";
import { auditLogs } from "@db/schema";
import {
  extractDriveFolderId,
  listDriveChildren,
  downloadDriveFile,
} from "../lib/googleDrive";
import { getDriveAccessToken } from "./driveConnection";
import { bestColorAssignment, GARMENT_COLOR_ANCHORS, guessGarmentColor, makeThumbnailDataUrl } from "../lib/garmentColorClassifier";
import { uploadDataUrlToR2 } from "../lib/r2";
import { bulkCreateProducts, type ProductWritableFields } from "./admin";

const IMAGE_MIME_PREFIX = "image/";
const MAX_DESIGN_FOLDERS = 200;

export type ScannedImage = {
  fileId: string;
  name: string;
  thumbnailDataUrl: string;
  guessedColor: string | null;
  confident: boolean;
};

export type ScannedDesign = {
  folderId: string;
  folderName: string;
  /** One entry per garment color the classifier found a confident match
   * for. Missing colors just mean no confident match — the founder can
   * still assign one manually from `extraImages`. */
  colorMatches: Record<string, ScannedImage>;
  /** Everything else in the folder: low-confidence guesses, ties that lost
   * to a better match, and non-matching files (e.g. raw print graphics
   * that ended up mixed into the folder). */
  extraImages: ScannedImage[];
  error?: string;
};

/**
 * Scans a Drive folder that's structured as one subfolder per design (the
 * founder's "T-web-ready" convention): lists every subfolder, then for
 * every image inside classifies its garment color with a cheap local
 * heuristic and returns small preview thumbnails for the admin review UI.
 * Nothing is uploaded or written to the database here — that only happens
 * in `commitDriveImport`, once the founder has reviewed and corrected any
 * guesses.
 */
export async function scanDriveFolder(folderLinkOrId: string): Promise<{
  folderId: string;
  designs: ScannedDesign[];
}> {
  const folderId = extractDriveFolderId(folderLinkOrId);
  const accessToken = await getDriveAccessToken();

  const children = await listDriveChildren(folderId, accessToken);
  const subfolders = children
    .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
    .slice(0, MAX_DESIGN_FOLDERS);

  const designs: ScannedDesign[] = [];

  for (const folder of subfolders) {
    try {
      const files = await listDriveChildren(folder.id, accessToken);
      const images = files.filter((f) => f.mimeType.startsWith(IMAGE_MIME_PREFIX));

      const candidates: Array<{ image: ScannedImage; distances: Record<string, number> | null; luminance: number | null }> = [];
      for (const file of images) {
        try {
          const { buffer } = await downloadDriveFile(file.id, accessToken);
          const [guess, thumbnailDataUrl] = await Promise.all([
            guessGarmentColor(buffer),
            makeThumbnailDataUrl(buffer),
          ]);
          candidates.push({
            image: {
              fileId: file.id,
              name: file.name,
              thumbnailDataUrl,
              guessedColor: guess.confident ? guess.colorName : null,
              confident: guess.confident,
            },
            distances: guess.distances,
            luminance: guess.luminance,
          });
        } catch (err) {
          candidates.push({
            image: {
              fileId: file.id,
              name: file.name,
              thumbnailDataUrl: "",
              guessedColor: null,
              confident: false,
            },
            distances: null,
            luminance: null,
          });
          console.error(`[drive-import] Failed to read ${file.name} in ${folder.name}:`, err);
        }
      }

      // True min-cost assignment across the whole folder — see
      // `bestColorAssignment` for why the old greedy "smallest single pair
      // first" approach could swap White/Grey photos when their distances
      // to those two close anchors happened to cross over. Only photos that
      // individually cleared the confidence bar participate, matching the
      // old behavior of leaving low-confidence photos for manual review
      // instead of forcing them into a slot.
      const colorNames = GARMENT_COLOR_ANCHORS.map((a) => a.name);
      const confidentCandidates = candidates.filter((c) => c.image.guessedColor);
      const assignment = bestColorAssignment(
        confidentCandidates.map((c) => ({ id: c.image.fileId, distances: c.distances, luminance: c.luminance ?? undefined })),
        colorNames,
      );
      const colorMatches: Record<string, ScannedImage> = {};
      const claimedFileIds = new Set<string>();
      for (const { id, color } of assignment) {
        const match = candidates.find((c) => c.image.fileId === id);
        if (!match) continue;
        colorMatches[color] = match.image;
        claimedFileIds.add(id);
      }
      const extraImages = candidates
        .filter((c) => !claimedFileIds.has(c.image.fileId))
        .map((c) => c.image);

      designs.push({ folderId: folder.id, folderName: folder.name, colorMatches, extraImages });
    } catch (err) {
      designs.push({
        folderId: folder.id,
        folderName: folder.name,
        colorMatches: {},
        extraImages: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { folderId, designs };
}

export type DriveImportSelection = {
  folderId: string;
  nameEn: string;
  nameAr?: string | null;
  productType: "tee" | "hoodie" | "accessory";
  price: number;
  sizes: string[];
  status: "draft" | "active";
  garmentStyle?: string | null;
  collectionName?: string | null;
  /** colorName -> the Drive fileId the founder confirmed for that color. */
  colorFiles: Record<string, string>;
};

/**
 * Re-downloads exactly the founder-approved files (never trusts anything
 * cached from the scan step), uploads each to R2, then hands off to the
 * existing `bulkCreateProducts` — so every default/validation rule that
 * already applies to Bulk Import and Quick Add applies here too.
 */
export async function commitDriveImport(
  selections: DriveImportSelection[],
  actorUserId: number,
) {
  const accessToken = await getDriveAccessToken();

  const items: Array<{
    product: ProductWritableFields & { name_en: string; product_type: "tee" | "hoodie" | "accessory" };
    colorImages: Record<string, string[]>;
  }> = [];
  const prepErrors: Array<{ name_en: string; error: string }> = [];

  for (const sel of selections) {
    try {
      const colorImages: Record<string, string[]> = {};
      for (const [colorName, fileId] of Object.entries(sel.colorFiles)) {
        if (!fileId) continue;
        const { buffer, mimeType } = await downloadDriveFile(fileId, accessToken);
        const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
        const url = await uploadDataUrlToR2(dataUrl, "products");
        if (url) colorImages[colorName] = [url];
      }

      const approvedColors = Object.keys(colorImages);
      if (approvedColors.length === 0) {
        prepErrors.push({ name_en: sel.nameEn, error: "No color photos uploaded successfully." });
        continue;
      }

      items.push({
        product: {
          name_en: sel.nameEn.trim(),
          name_ar: sel.nameAr?.trim() || null,
          product_type: sel.productType,
          price: sel.price,
          sizes: sel.sizes,
          approved_colors: approvedColors,
          images: [colorImages[approvedColors[0]][0]],
          status: sel.status,
          garment_style: sel.garmentStyle || null,
          collection_name: sel.collectionName || null,
        },
        colorImages,
      });
    } catch (err) {
      prepErrors.push({
        name_en: sel.nameEn,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const results = items.length ? await bulkCreateProducts(items, actorUserId) : [];

  await getDb().insert(auditLogs).values({
    actorUserId,
    action: "product.drive_imported",
    entity: "product",
    entityId: null,
    detail: { total: selections.length, succeeded: results.filter((r) => r.success).length },
  });

  return [
    ...results,
    ...prepErrors.map((e) => ({ success: false, name_en: e.name_en, error: e.error })),
  ];
}
