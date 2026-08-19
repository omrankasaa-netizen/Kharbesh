import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../api/queries/connection";

/**
 * One-off migration: the six launch products were seeded with placeholder
 * artwork (podcats/ya-ammi/memo/hayyana/paperboat/door) that never shipped.
 * This replaces each existing row in place with a real approved Kharbesh
 * design — same slots, same sort order, real names/copy/imagery.
 * Matched by the OLD nameEn so it's safe to run once against the live table.
 */

const updates = [
  {
    matchNameEn: "PODCATS Tee",
    nameEn: "Financially Unstable Tee",
    nameAr: "تيشيرت تمام بس مالياً منهار",
    phraseAr: "تمام… بس مالياً منهار",
    phraseEn: "I'm Fine(ancially Unstable)",
    payoffEn: "A calm reassurance, until the red line breaks the sentence in half.",
    descriptionEn: "Oversized cotton tee with the Financially Unstable artwork, chest placement.",
    descriptionAr: "تيشيرت قطن أوفرسايز مع رسمة \"تمام بس مالياً منهار\" على الصدر.",
    collectionName: "Kharbesh Quotes",
    mood: "Dry",
    image: "/assets/designs/financially-unstable.jpg",
  },
  {
    matchNameEn: "Ya Ammi Tee",
    nameEn: "Jeyeh 3a Beli Tee",
    nameAr: "تيشيرت جاي عبالي",
    phraseAr: "جاي عبالي",
    phraseEn: "Jeyeh 3a Beli",
    payoffEn: "The thought that shows up uninvited, every single time.",
    descriptionEn: "Classic tee with the Jeyeh 3a Beli artwork, chest placement.",
    descriptionAr: "تيشيرت كلاسيك مع رسمة \"جاي عبالي\" على الصدر.",
    collectionName: "Kharbesh Quotes",
    mood: "Witty",
    image: "/assets/designs/jeyeh-3a-beli.jpg",
  },
  {
    matchNameEn: "Urgent Request Tee",
    nameEn: "Masari Be Amen Tee",
    nameAr: "تيشيرت المصاري بأمان",
    phraseAr: "المصاري بأمان… بس مش معنا",
    phraseEn: "Money's Safe (Just Not With Us)",
    payoffEn: "Somewhere out there, it's doing great.",
    descriptionEn: "Oversized tee with the Masari Be Amen artwork, chest placement.",
    descriptionAr: "تيشيرت أوفرسايز مع رسمة \"المصاري بأمان بس مش معنا\" على الصدر.",
    collectionName: "Kharbesh Quotes",
    mood: "Sarcastic",
    image: "/assets/designs/masari-be-amen.jpg",
  },
  {
    matchNameEn: "The Hayyana Tee",
    nameEn: "Greatest Weapon Tee",
    nameAr: "تيشيرت أقوى سلاحك",
    phraseAr: "أقوى سلاحك عقلك",
    phraseEn: "Your Greatest Weapon",
    payoffEn: "Use it before you use your voice.",
    descriptionEn: "Oversized tee with the Greatest Weapon artwork, chest placement.",
    descriptionAr: "تيشيرت أوفرسايز مع رسمة \"أقوى سلاحك عقلك\" على الصدر.",
    collectionName: "Kharbesh Quotes",
    mood: "Bold",
    image: "/assets/designs/greatest-weapon.jpg",
  },
  {
    matchNameEn: "Paper Boat Tee",
    nameEn: "Bala Hob Bala Batikh Tee",
    nameAr: "تيشيرت بلا حب بلا بطيخ",
    phraseAr: "بلا حب بلا بطّيخ",
    phraseEn: "No Love, No Watermelon",
    payoffEn: "Summer has its priorities.",
    descriptionEn: "Nostalgic Rahbani-toned artwork on cream cotton, chest placement.",
    descriptionAr: "رسمة رحبانية النفس على قطن كريمي، بلا حب بلا بطيخ.",
    collectionName: "Kharbesh Rahbaniet",
    mood: "Nostalgic",
    image: "/assets/designs/bala-hob-bala-batikh.jpg",
  },
  {
    matchNameEn: "Your Opinion? Tee",
    nameEn: "CEO of Everything Tee",
    nameAr: "تيشيرت رئيس مجلس إدارة كل شي",
    phraseAr: "رئيس مجلس إدارة كل شي",
    phraseEn: "CEO of Everything",
    payoffEn: "Nobody elected you. You still show up to every meeting.",
    descriptionEn: "The workplace tee for the self-appointed boss of every group chat.",
    descriptionAr: "تيشيرت الشغل لكل واحد نصّب حاله رئيس بلا انتخاب.",
    collectionName: "Kharbesh Quotes",
    mood: "Sarcastic",
    image: "/assets/designs/ceo-of-everything.jpg",
  },
] as const;

async function run() {
  const db = getDb();
  for (const u of updates) {
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.nameEn, u.matchNameEn),
    });
    if (!existing) {
      console.log(`- skip (not found): ${u.matchNameEn}`);
      continue;
    }
    await db
      .update(schema.products)
      .set({
        nameEn: u.nameEn,
        nameAr: u.nameAr,
        phraseAr: u.phraseAr,
        phraseEn: u.phraseEn,
        payoffEn: u.payoffEn,
        descriptionEn: u.descriptionEn,
        descriptionAr: u.descriptionAr,
        collectionName: u.collectionName,
        mood: u.mood,
        images: [u.image],
      })
      .where(eq(schema.products.id, existing.id));
    console.log(`+ updated: ${u.matchNameEn} -> ${u.nameEn}`);
  }
  console.log("Real-design migration complete.");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
