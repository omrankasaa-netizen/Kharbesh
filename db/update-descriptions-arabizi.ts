import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../api/queries/connection";

/**
 * One-off update: rewrite descriptionEn for the launch products into Arabizi
 * with a dry/sarcastic Kharbesh voice, per explicit user request. Matched by
 * the current (frozen) nameEn — no other fields are touched, and descriptionAr
 * is left as-is.
 */

const updates = [
  {
    nameEn: "Financially Unstable Tee",
    descriptionEn:
      "Oversized, 100% cotton, w kello tamam — la7ad ma toua2 3al statement el bankeh. Erta7, el flous masheye (yimkin).",
  },
  {
    nameEn: "Jeyeh 3a Beli Tee",
    descriptionEn:
      "Classic fit, bas el fikra 3am toua3 3laik, w metl kel marra — mesh rah tro7 bel sor3a.",
  },
  {
    nameEn: "Masari Be Amen Tee",
    descriptionEn:
      "Oversized, w metl masarina — mawjoud, bas mesh 3anna. Chest placement, la ta3zeye la 7ad.",
  },
  {
    nameEn: "Greatest Weapon Tee",
    descriptionEn:
      "Oversized. Sta3mel 32lak abl la teftah temmak — heyye el nasi7a el wa7ide bel tishirt.",
  },
  {
    nameEn: "Bala Hob Bala Batikh Tee",
    descriptionEn:
      "Cream cotton, nostalgia rahbaniyeh, w sayf bala hob... bas el batikh lezim yeb2a.",
  },
  {
    nameEn: "CEO of Everything Tee",
    descriptionEn:
      "Tishirt el shoughol la kel wa7ad nassab 7alo ra2ees bala entikhabat — el group chat sar sherke, w inte el CEO.",
  },
] as const;

async function run() {
  const db = getDb();
  for (const u of updates) {
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.nameEn, u.nameEn),
    });
    if (!existing) {
      console.log(`- skip (not found): ${u.nameEn}`);
      continue;
    }
    await db
      .update(schema.products)
      .set({ descriptionEn: u.descriptionEn })
      .where(eq(schema.products.id, existing.id));
    console.log(`+ updated description: ${u.nameEn}`);
  }
  console.log("Arabizi description migration complete.");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
