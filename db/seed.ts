import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../api/queries/connection";

/**
 * Seeds the storefront catalog in the Base44-shaped model:
 * collections, garment colors, garment styles, and the six launch
 * products built from the approved READY_DESIGNS artwork.
 * Idempotent: existing rows (matched by unique keys / name) are skipped.
 */

const collectionSeeds = [
  {
    nameEn: "Kharbesh Politics",
    nameAr: "خربش سياسة",
    slug: "politics",
    descriptionEn: "The country, as we live it. Worn, not said.",
    descriptionAr: "البلد كما نعيشه. ملبوس، مش محكي.",
    accent: "#B23A2E",
    sortOrder: 1,
  },
  {
    nameEn: "Kharbesh Quotes",
    nameAr: "خربش أقوال",
    slug: "quotes",
    descriptionEn: "Things we say every day, finally on a tee.",
    descriptionAr: "أشياء منقولها كل يوم، أخيراً على تيشيرت.",
    accent: "#D4E500",
    sortOrder: 2,
  },
  {
    nameEn: "Kharbesh Rahbaniet",
    nameAr: "خربش رحبانيات",
    slug: "rahbaniet",
    descriptionEn: "A love letter to the Rahbani universe.",
    descriptionAr: "رسالة حب لعالم الرحابنة.",
    accent: "#F5EFE1",
    sortOrder: 3,
  },
] as const;

const colorSeeds = [
  { nameEn: "Black", nameAr: "أسود", hex: "#141210", sortOrder: 1 },
  { nameEn: "Cream", nameAr: "كريمي", hex: "#F5EFE1", sortOrder: 2 },
  { nameEn: "White", nameAr: "أبيض", hex: "#FFFFFF", sortOrder: 3 },
  { nameEn: "Brick", nameAr: "طوبي", hex: "#B23A2E", sortOrder: 4 },
] as const;

const styleSeeds = [
  {
    nameEn: "Oversized Tee",
    nameAr: "تيشيرت أوفرسايز",
    priceModifierCents: 0,
    sizes: ["S", "M", "L", "XL", "XXL"],
    sortOrder: 1,
  },
  {
    nameEn: "Classic Tee",
    nameAr: "تيشيرت كلاسيك",
    priceModifierCents: 0,
    sizes: ["S", "M", "L", "XL", "XXL"],
    sortOrder: 2,
  },
  {
    nameEn: "Heavyweight Hoodie",
    nameAr: "هودي ثقيل",
    priceModifierCents: 2400,
    sizes: ["S", "M", "L", "XL", "XXL"],
    sortOrder: 3,
  },
] as const;

const TEE_SIZES = ["S", "M", "L", "XL", "XXL"];
const TEE_COLORS = ["Black", "Cream", "White"];

const productSeeds = [
  {
    nameEn: "PODCATS Tee",
    nameAr: "تيشيرت بودكاتس",
    phraseAr: "بودكاتس",
    phraseEn: "PODCATS",
    payoffEn: "The cats are doing the talking.",
    descriptionEn: "Oversized cotton tee with the PODCATS illustration, chest placement.",
    descriptionAr: "تيشيرت قطن أوفرسايز مع رسمة بودكاتس على الصدر.",
    collectionName: "Kharbesh Quotes",
    mood: "Playful",
    image: "/assets/designs/podcats.png",
    priceCents: 3400,
    sortOrder: 1,
  },
  {
    nameEn: "Ya Ammi Tee",
    nameAr: "تيشيرت يا عمي",
    phraseAr: "يا عمي",
    phraseEn: "Ya Ammi",
    payoffEn: "Said with love. Mostly.",
    descriptionEn: "Classic tee with the Ya Ammi speech bubble artwork.",
    descriptionAr: "تيشيرت كلاسيك مع فقاعة يا عمي.",
    collectionName: "Kharbesh Quotes",
    mood: "Witty",
    image: "/assets/designs/ya-ammi.png",
    priceCents: 3200,
    sortOrder: 2,
  },
  {
    nameEn: "Urgent Request Tee",
    nameAr: "تيشيرت طلب عاجل",
    phraseAr: "طلب عاجل",
    phraseEn: "Urgent Request",
    payoffEn: "Stamped. Approved. Worn.",
    descriptionEn: "The memo everybody knows, finally wearable.",
    descriptionAr: "المذكرة اللي الكل بيعرفها، صارت بتتلبس.",
    collectionName: "Kharbesh Politics",
    mood: "Sarcastic",
    image: "/assets/designs/memo.png",
    priceCents: 3400,
    sortOrder: 3,
  },
  {
    nameEn: "The Hayyana Tee",
    nameAr: "تيشيرت الحيونة",
    phraseAr: "الحيونة",
    phraseEn: "The Hayyana",
    payoffEn: "You know the one.",
    descriptionEn: "Scribble artwork tee from the politics line.",
    descriptionAr: "تيشيرت بخربشة الحيونة من خط السياسة.",
    collectionName: "Kharbesh Politics",
    mood: "Bold",
    image: "/assets/designs/hayyana.png",
    priceCents: 3400,
    sortOrder: 4,
  },
  {
    nameEn: "Paper Boat Tee",
    nameAr: "تيشيرت قارب ورق",
    phraseAr: "قارب ورق",
    phraseEn: "Paper Boat",
    payoffEn: "Fold it. Float it. Wear it.",
    descriptionEn: "Rahbani-inspired paper boat illustration on cream cotton.",
    descriptionAr: "قارب الورق الرحباني على قطن كريمي.",
    collectionName: "Kharbesh Rahbaniet",
    mood: "Nostalgic",
    image: "/assets/designs/paperboat.png",
    priceCents: 3600,
    sortOrder: 5,
  },
  {
    nameEn: "Your Opinion? Tee",
    nameAr: "تيشيرت هيدا رأيك",
    phraseAr: "هيدا رأيك",
    phraseEn: "Your Opinion?",
    payoffEn: "The door says it all.",
    descriptionEn: "The door illustration tee — an answer without words.",
    descriptionAr: "تيشيرت رسمة الباب — جواب من دون كلمات.",
    collectionName: "Kharbesh Politics",
    mood: "Sarcastic",
    image: "/assets/designs/door.png",
    priceCents: 3200,
    sortOrder: 6,
  },
] as const;

async function seed() {
  const db = getDb();

  for (const c of collectionSeeds) {
    const existing = await db.query.collections.findFirst({
      where: eq(schema.collections.slug, c.slug),
    });
    if (!existing) {
      await db.insert(schema.collections).values(c);
      console.log(`+ collection ${c.slug}`);
    }
  }

  for (const c of colorSeeds) {
    const existing = await db.query.garmentColors.findFirst({
      where: eq(schema.garmentColors.nameEn, c.nameEn),
    });
    if (!existing) {
      await db.insert(schema.garmentColors).values(c);
      console.log(`+ color ${c.nameEn}`);
    }
  }

  for (const s of styleSeeds) {
    const existing = await db.query.garmentStyles.findFirst({
      where: eq(schema.garmentStyles.nameEn, s.nameEn),
    });
    if (!existing) {
      await db.insert(schema.garmentStyles).values({ ...s, sizes: [...s.sizes] });
      console.log(`+ style ${s.nameEn}`);
    }
  }

  for (const p of productSeeds) {
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.nameEn, p.nameEn),
    });
    if (existing) continue;
    await db.insert(schema.products).values({
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      phraseAr: p.phraseAr,
      phraseEn: p.phraseEn,
      payoffEn: p.payoffEn,
      descriptionEn: p.descriptionEn,
      descriptionAr: p.descriptionAr,
      collectionName: p.collectionName,
      mood: p.mood,
      productType: "tee",
      garmentStyle: "Oversized Tee",
      fitEn: "Oversized",
      careEn: "Machine wash cold, inside out. Hang dry.",
      careAr: "غسيل بارد ومقلوب. تجفيف بالهواء.",
      placement: "Front print",
      priceCents: p.priceCents,
      approvedColors: [...TEE_COLORS],
      sizes: [...TEE_SIZES],
      images: [p.image],
      status: "active",
      preorderType: "always_on",
      estimatedProductionDays: 10,
      estimatedDispatchWindow: "10–14 days",
      dropName: "Always-on",
      sortOrder: p.sortOrder,
    });
    console.log(`+ product ${p.nameEn}`);
  }

  console.log("Kharbesh catalog seeded.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
