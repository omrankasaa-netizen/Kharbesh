import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../api/queries/connection";

/**
 * One-off update: rewrite descriptionEn for the three collections into
 * Arabizi with the same dry/sarcastic Kharbesh voice, per explicit user
 * request. Matched by slug — descriptionAr and everything else is untouched.
 */

const updates = [
  {
    slug: "politics",
    descriptionEn: "El balad, zay ma 3am n3icha. Labbisha, la ma tehkiha.",
  },
  {
    slug: "quotes",
    descriptionEn: "Eshi mnehkih kel yom, sar 3ala tishirt akhiran.",
  },
  {
    slug: "rahbaniet",
    descriptionEn: "Risale ghram la 3alam el Rahbaniyeh.",
  },
] as const;

async function run() {
  const db = getDb();
  for (const u of updates) {
    const existing = await db.query.collections.findFirst({
      where: eq(schema.collections.slug, u.slug),
    });
    if (!existing) {
      console.log(`SKIP (not found): ${u.slug}`);
      continue;
    }
    await db
      .update(schema.collections)
      .set({ descriptionEn: u.descriptionEn })
      .where(eq(schema.collections.slug, u.slug));
    console.log(`Updated: ${u.slug} -> ${u.descriptionEn}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
