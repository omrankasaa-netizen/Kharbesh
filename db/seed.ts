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
    priceCents: 3500,
    sortOrder: 1,
  },
  {
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
    priceCents: 3500,
    sortOrder: 2,
  },
  {
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
    priceCents: 3500,
    sortOrder: 3,
  },
  {
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
    priceCents: 3500,
    sortOrder: 4,
  },
  {
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
    priceCents: 3500,
    sortOrder: 5,
  },
  {
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
    priceCents: 3500,
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
      images: ["/assets/brand/placeholder-front.jpg", "/assets/brand/placeholder-back.jpg"],
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
