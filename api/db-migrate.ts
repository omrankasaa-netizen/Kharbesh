import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * Some early deployments created the base schema by hand (or via a tool
 * other than `drizzle-orm`'s migrator) before `__drizzle_migrations` was
 * ever seeded. When that happens, `migrate()` tries to replay every
 * migration from scratch inside a single transaction, hits
 * `ER_TABLE_EXISTS_ERROR` on the very first `CREATE TABLE`, and the whole
 * transaction — including later, genuinely-pending migrations — rolls
 * back. Silently. Every boot. Forever.
 *
 * This runs before the real `migrate()` call and closes that gap: for each
 * migration file, if every table it creates already exists in the
 * database, record it as applied (using the same hash/timestamp format
 * `migrate()` itself would have written) so `migrate()` skips it and moves
 * on to whatever is actually new. It never marks a migration as applied
 * unless 100% of the tables it creates are already present, so a
 * partially-applied migration is never skipped.
 */
export async function seedAlreadyAppliedMigrations(
  db: MySql2Database<Record<string, unknown>>,
  migrationsFolder: string,
) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return;
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
    entries: { tag: string; when: number }[];
  };

  await db.execute(
    sql.raw(
      `create table if not exists \`${MIGRATIONS_TABLE}\` (id serial primary key, hash text not null, created_at bigint)`,
    ),
  );

  const existingRows = (await db.execute(
    sql.raw(`select hash from \`${MIGRATIONS_TABLE}\``),
  )) as unknown as [{ hash: string }[]];
  const recordedHashes = new Set((existingRows[0] ?? []).map((r) => r.hash));

  const tableRows = (await db.execute(sql.raw("show tables"))) as unknown as [
    Record<string, string>[],
  ];
  const existingTables = new Set(
    (tableRows[0] ?? []).map((r) => Object.values(r)[0]),
  );

  for (const entry of journal.entries) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) continue;
    const content = fs.readFileSync(sqlPath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    if (recordedHashes.has(hash)) continue;

    const createdTables = [...content.matchAll(/CREATE TABLE `([^`]+)`/gi)].map(
      (m) => m[1],
    );
    if (createdTables.length === 0) continue;
    const allTablesExist = createdTables.every((t) => existingTables.has(t));
    if (!allTablesExist) continue;

    // A migration file can mix `CREATE TABLE` with `ALTER TABLE ... ADD` on
    // tables that already existed (e.g. adding a column to `products`
    // alongside creating a brand-new `campaigns` table in the same file).
    // Checking only the created tables is not enough — if every new table
    // already happens to exist (from an earlier partial/manual run), this
    // function would mark the whole migration "applied" and permanently
    // skip it, silently dropping its ALTER TABLE statements forever. Guard
    // against that by also requiring every column an ALTER TABLE ... ADD
    // statement targets to already be present.
    const alteredColumns = [
      ...content.matchAll(/ALTER TABLE `([^`]+)` ADD `([^`]+)`/gi),
    ].map((m) => ({ table: m[1], column: m[2] }));
    if (alteredColumns.length > 0) {
      const columnRows = (await db.execute(
        sql.raw(
          "select table_name as tbl, column_name as col from information_schema.columns where table_schema = database()",
        ),
      )) as unknown as [{ tbl: string; col: string }[]];
      const existingColumns = new Set(
        (columnRows[0] ?? []).map((r) => `${r.tbl}.${r.col}`),
      );
      const allColumnsExist = alteredColumns.every(({ table, column }) =>
        existingColumns.has(`${table}.${column}`),
      );
      if (!allColumnsExist) continue;
    }

    await db.execute(
      sql.raw(
        `insert into \`${MIGRATIONS_TABLE}\` (\`hash\`, \`created_at\`) values ('${hash}', ${entry.when})`,
      ),
    );
    console.log(
      `[db] backfilled migration record for already-applied ${entry.tag} (tables pre-existed: ${createdTables.join(", ")})`,
    );
  }
}

/**
 * One-time direct repair for a specific gap this file's own safety net used
 * to miss (see the ALTER-TABLE-column check added above): if migration
 * `0002_dear_wolverine`'s four new tables (`campaigns`, `discounts`,
 * `promo_codes`, `product_color_images`) already existed in a database from
 * an earlier partial run, the old, narrower check would have marked 0002 as
 * fully applied and permanently skipped it — even though it never actually
 * ran the `ALTER TABLE products ADD costPriceCents` / `ALTER TABLE orders
 * ADD ...` statements in that same file. That false "applied" record is
 * already committed in `__drizzle_migrations` on any database this happened
 * to, so fixing the check above only prevents new occurrences — it can't
 * retroactively re-run 0002 there. This directly checks for and adds
 * exactly those specific columns (and, defensively, the four tables) if
 * they're still missing, regardless of migration-tracking state.
 */
export async function repairMigration0002Gaps(
  db: MySql2Database<Record<string, unknown>>,
) {
  const columnRows = (await db.execute(
    sql.raw(
      "select table_name as tbl, column_name as col from information_schema.columns where table_schema = database()",
    ),
  )) as unknown as [{ tbl: string; col: string }[]];
  const existingColumns = new Set(
    (columnRows[0] ?? []).map((r) => `${r.tbl}.${r.col}`),
  );
  const columnPatches: { table: string; column: string; ddl: string }[] = [
    { table: "products", column: "costPriceCents", ddl: "ALTER TABLE `products` ADD `costPriceCents` int" },
    { table: "orders", column: "discountCents", ddl: "ALTER TABLE `orders` ADD `discountCents` int DEFAULT 0 NOT NULL" },
    { table: "orders", column: "promoCode", ddl: "ALTER TABLE `orders` ADD `promoCode` varchar(40)" },
    { table: "orders", column: "appliedDiscounts", ddl: "ALTER TABLE `orders` ADD `appliedDiscounts` json" },
  ];

  for (const patch of columnPatches) {
    if (existingColumns.has(`${patch.table}.${patch.column}`)) {
      continue;
    }
    try {
      await db.execute(sql.raw(patch.ddl));
      console.log(`[db] repaired missing column ${patch.table}.${patch.column}`);
    } catch (patchError) {
      console.error(`[db] FAILED to repair column ${patch.table}.${patch.column}:`, patchError);
    }
  }

  const tableRows = (await db.execute(sql.raw("show tables"))) as unknown as [
    Record<string, string>[],
  ];
  const existingTables = new Set(
    (tableRows[0] ?? []).map((r) => Object.values(r)[0]),
  );

  const tableCreates: { table: string; ddl: string }[] = [
    {
      table: "campaigns",
      ddl: "CREATE TABLE `campaigns` (\n\t`id` serial AUTO_INCREMENT NOT NULL,\n\t`titleEn` varchar(200) NOT NULL,\n\t`titleAr` varchar(200),\n\t`subtitleEn` varchar(300),\n\t`subtitleAr` varchar(300),\n\t`ctaLabelEn` varchar(80),\n\t`ctaLabelAr` varchar(80),\n\t`linkUrl` varchar(255),\n\t`promoCodeId` bigint unsigned,\n\t`discountId` bigint unsigned,\n\t`active` boolean NOT NULL DEFAULT true,\n\t`startsAt` timestamp,\n\t`expiresAt` timestamp,\n\t`sortOrder` int NOT NULL DEFAULT 0,\n\t`createdAt` timestamp NOT NULL DEFAULT (now()),\n\t`updatedAt` timestamp NOT NULL DEFAULT (now()),\n\tCONSTRAINT `campaigns_id` PRIMARY KEY(`id`)\n)",
    },
    {
      table: "discounts",
      ddl: "CREATE TABLE `discounts` (\n\t`id` serial AUTO_INCREMENT NOT NULL,\n\t`nameEn` varchar(160) NOT NULL,\n\t`nameAr` varchar(160),\n\t`type` enum('percent','fixed') NOT NULL,\n\t`value` int NOT NULL,\n\t`appliesTo` enum('all','product_type','collection') NOT NULL DEFAULT 'all',\n\t`appliesValue` varchar(160),\n\t`active` boolean NOT NULL DEFAULT true,\n\t`startsAt` timestamp,\n\t`expiresAt` timestamp,\n\t`createdAt` timestamp NOT NULL DEFAULT (now()),\n\t`updatedAt` timestamp NOT NULL DEFAULT (now()),\n\tCONSTRAINT `discounts_id` PRIMARY KEY(`id`)\n)",
    },
    {
      table: "product_color_images",
      ddl: "CREATE TABLE `product_color_images` (\n\t`id` serial AUTO_INCREMENT NOT NULL,\n\t`productId` bigint unsigned NOT NULL,\n\t`colorName` varchar(80) NOT NULL,\n\t`images` json NOT NULL,\n\t`sortOrder` int NOT NULL DEFAULT 0,\n\t`createdAt` timestamp NOT NULL DEFAULT (now()),\n\t`updatedAt` timestamp NOT NULL DEFAULT (now()),\n\tCONSTRAINT `product_color_images_id` PRIMARY KEY(`id`),\n\tCONSTRAINT `product_color_images_variant_idx` UNIQUE(`productId`,`colorName`)\n)",
    },
    {
      table: "promo_codes",
      ddl: "CREATE TABLE `promo_codes` (\n\t`id` serial AUTO_INCREMENT NOT NULL,\n\t`code` varchar(40) NOT NULL,\n\t`type` enum('percent','fixed') NOT NULL,\n\t`value` int NOT NULL,\n\t`minOrderCents` int,\n\t`maxUses` int,\n\t`usesCount` int NOT NULL DEFAULT 0,\n\t`active` boolean NOT NULL DEFAULT true,\n\t`startsAt` timestamp,\n\t`expiresAt` timestamp,\n\t`createdByUserId` bigint unsigned,\n\t`createdAt` timestamp NOT NULL DEFAULT (now()),\n\t`updatedAt` timestamp NOT NULL DEFAULT (now()),\n\tCONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),\n\tCONSTRAINT `promo_codes_code_unique` UNIQUE(`code`)\n)",
    },
  ];
  for (const { table, ddl } of tableCreates) {
    if (existingTables.has(table)) {
      continue;
    }
    try {
      await db.execute(sql.raw(ddl));
      existingTables.add(table);
      console.log(`[db] repaired missing table ${table}`);
    } catch (tableError) {
      console.error(`[db] FAILED to repair table ${table}:`, tableError);
    }
  }

  // Best-effort: the FKs/index from 0002 that reference the tables above.
  // Wrapped individually so a "duplicate" error on one (if it already
  // exists) never blocks the other repairs in this function.
  const bestEffort: { check: string; ddl: string }[] = [
    {
      check:
        "select 1 from information_schema.table_constraints where table_schema = database() and table_name = 'campaigns' and constraint_name = 'campaigns_promoCodeId_promo_codes_id_fk'",
      ddl: "ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_promoCodeId_promo_codes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE set null ON UPDATE no action",
    },
    {
      check:
        "select 1 from information_schema.table_constraints where table_schema = database() and table_name = 'campaigns' and constraint_name = 'campaigns_discountId_discounts_id_fk'",
      ddl: "ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_discountId_discounts_id_fk` FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE set null ON UPDATE no action",
    },
    {
      check:
        "select 1 from information_schema.table_constraints where table_schema = database() and table_name = 'product_color_images' and constraint_name = 'product_color_images_productId_products_id_fk'",
      ddl: "ALTER TABLE `product_color_images` ADD CONSTRAINT `product_color_images_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action",
    },
    {
      check:
        "select 1 from information_schema.statistics where table_schema = database() and table_name = 'product_color_images' and index_name = 'product_color_images_product_idx'",
      ddl: "CREATE INDEX `product_color_images_product_idx` ON `product_color_images` (`productId`)",
    },
  ];
  for (const { check, ddl } of bestEffort) {
    try {
      const rows = (await db.execute(sql.raw(check))) as unknown as [unknown[]];
      if ((rows[0] ?? []).length > 0) continue;
      await db.execute(sql.raw(ddl));
    } catch (error) {
      console.error("[db] best-effort repair statement failed (non-fatal):", error);
    }
  }
}

/**
 * One-time data repair for a catalog-wide White/Grey photo swap. Direct
 * visual inspection of every product's `product_color_images` rows (not
 * just the earlier main-image spot check) showed that across the entire
 * catalog, the row labeled "White" actually holds the photo of the
 * heather-grey garment and the row labeled "Grey" holds the photo of the
 * white garment — Black and Antracid rows are correct everywhere. This
 * supersedes an earlier, incorrect theory (that Antracid held a mislabeled
 * white photo) which never matched the real per-color image data.
 *
 * Fix: for every product that has exactly one White row and one Grey row,
 * swap only their `images` JSON (colorName and sortOrder stay put on each
 * row). Idempotency is tracked with a small marker table — Railway can
 * restart the app without a new deploy, and swapping the same pair twice
 * would just swap it back, so each productId is only ever repaired once.
 *
 * SCOPE GUARD (added after an incident on 2026-09-01): this repair was
 * written as a one-time catalog-wide fix diagnosed against the products
 * that existed on 2026-08-28 (ids 1-48). It has no way to tell "still
 * swapped from the original bug" apart from "legitimately correct and
 * just hasn't been through this repair yet" — it always swaps whatever
 * it finds. That's fine for the original cohort (which really was
 * swapped), but on 2026-08-31 it silently caught products 49-64 the
 * first time the app rebooted after they were correctly imported,
 * flipping their White/Grey photos from correct to wrong. To make sure
 * this legacy one-time repair can never again misfire on a brand-new,
 * correctly-imported product, it is hard-capped to only ever consider
 * `productId <= LEGACY_WHITE_GREY_REPAIR_MAX_ID` (the last id that
 * existed before the 2026-08-28 fix went live). Do not raise this
 * constant — any product created after that date must never be touched
 * by this function again.
 */
const LEGACY_WHITE_GREY_REPAIR_MAX_ID = 48;

export async function repairSwappedWhiteGreyPhotos(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `color_swap_repairs` (`productId` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select productId from `color_swap_repairs`"),
  )) as unknown as [{ productId: number }[]];
  const appliedSet = new Set((alreadyApplied[0] ?? []).map((r) => r.productId));

  const rows = (await db.execute(
    sql.raw(
      `select id, productId, colorName, images from \`product_color_images\` where colorName in ('White', 'Grey') and productId <= ${LEGACY_WHITE_GREY_REPAIR_MAX_ID}`,
    ),
  )) as unknown as [{ id: number; productId: number; colorName: string; images: unknown }[]];

  const byProduct = new Map<number, { white?: { id: number; images: unknown }; grey?: { id: number; images: unknown } }>();
  for (const row of rows[0] ?? []) {
    const entry = byProduct.get(row.productId) ?? {};
    if (row.colorName === "White") entry.white = { id: row.id, images: row.images };
    if (row.colorName === "Grey") entry.grey = { id: row.id, images: row.images };
    byProduct.set(row.productId, entry);
  }

  let repairedCount = 0;
  for (const [productId, { white, grey }] of byProduct) {
    if (appliedSet.has(productId)) continue;
    if (!white || !grey) {
      console.log(
        `[db] color-swap repair: product ${productId} missing a White or Grey row — skipping`,
      );
      continue;
    }
    try {
      const whiteImagesJson = JSON.stringify(white.images ?? []).replace(/'/g, "''");
      const greyImagesJson = JSON.stringify(grey.images ?? []).replace(/'/g, "''");

      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${greyImagesJson}', updatedAt = NOW() where id = ${white.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${whiteImagesJson}', updatedAt = NOW() where id = ${grey.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `insert into \`color_swap_repairs\` (productId) values (${productId})`,
        ),
      );
      repairedCount++;
      console.log(`[db] color-swap repair: swapped White/Grey photos for product ${productId}`);
    } catch (error) {
      console.error(`[db] color-swap repair FAILED for product ${productId}:`, error);
    }
  }
  console.log(`[db] color-swap repair: done, ${repairedCount} product(s) repaired this run`);
}

/**
 * One-time data repair for the "Botox Bel sayfyeh w detox bel shatwyeh"
 * product, which exists as 4 near-duplicate rows (ids 1, 2, 3, 4) created
 * within an hour of each other on 2026-08-21 — almost certainly repeated
 * re-uploads of the same design. On the storefront grid, `ProductCard`
 * shows only `images[0]` as the card thumbnail; 3 of the 4 rows had the
 * generic blank front-shirt placeholder (`/assets/brand/standard-front-black.jpg`)
 * as `images[0]`, so the same design appeared to show up 4 times with only
 * a plain front photo instead of the real printed design.
 *
 * Fix: keep id 1 (the most complete record — full Arabic name/phrase, all
 * 5 sizes), reorder its `images` so the real back-print design photo shows
 * first, and archive (`status = 'archived'`, same as the admin panel's
 * `deleteProduct`) ids 2, 3, and 4 so they disappear from `useProducts`'
 * `status === 'active'` filter. Nothing is hard-deleted. Idempotent via a
 * marker table, same pattern as `repairSwappedWhiteGreyPhotos` above.
 */
export async function repairBotoxSayfyehDuplicates(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `botox_sayfyeh_dedupe_repair` (`id` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select id from `botox_sayfyeh_dedupe_repair` where id = 1"),
  )) as unknown as [unknown[]];
  if ((alreadyApplied[0] ?? []).length > 0) {
    console.log("[db] botox/sayfyeh dedupe repair: already applied, skipping");
    return;
  }

  const rows = (await db.execute(
    sql.raw("select id, nameEn, status, images from `products` where id in (1,2,3,4)"),
  )) as unknown as [{ id: number; nameEn: string; status: string; images: unknown }[]];
  const byId = new Map((rows[0] ?? []).map((r) => [r.id, r]));

  // Guard: only proceed if the 4 rows still look like the diagnosed cluster
  // (all still named/phrased around "botox"/"sayfyeh" and still active).
  // If the data has already changed (e.g. manually fixed), skip safely.
  const expectedIds = [1, 2, 3, 4];
  const allPresentAndActive = expectedIds.every((id) => {
    const row = byId.get(id);
    return (
      row &&
      row.status === "active" &&
      /botox|sayfyeh/i.test(row.nameEn || "")
    );
  });
  if (!allPresentAndActive) {
    console.log(
      "[db] botox/sayfyeh dedupe repair: rows 1-4 no longer match expected cluster, skipping",
    );
    return;
  }

  try {
    const newImages = JSON.stringify([
      "https://img.kharbesh961.com/products/f05cb114a6a2ec957a9f39ef5f1219cf.webp",
      "https://img.kharbesh961.com/products/8b0e3bb208cc5ea2caa50535f7007908.webp",
    ]).replace(/'/g, "''");

    await db.execute(
      sql.raw(`update \`products\` set images = '${newImages}', updatedAt = NOW() where id = 1`),
    );
    await db.execute(
      sql.raw("update `products` set status = 'archived', updatedAt = NOW() where id in (2,3,4)"),
    );
    await db.execute(
      sql.raw(
        "insert into `audit_logs` (action, entity, entityId, detail, createdAt) values ('product.updated', 'product', '1', '{\"reason\":\"dedupe botox/sayfyeh duplicates\",\"via\":\"db-migrate repair\"}', NOW())",
      ),
    );
    for (const id of [2, 3, 4]) {
      await db.execute(
        sql.raw(
          `insert into \`audit_logs\` (action, entity, entityId, detail, createdAt) values ('product.archived', 'product', '${id}', '{"reason":"dedupe botox/sayfyeh duplicates","via":"db-migrate repair"}', NOW())`,
        ),
      );
    }
    await db.execute(sql.raw("insert into `botox_sayfyeh_dedupe_repair` (id) values (1)"));
    console.log(
      "[db] botox/sayfyeh dedupe repair: fixed id 1 images, archived ids 2,3,4",
    );
  } catch (error) {
    console.error("[db] botox/sayfyeh dedupe repair FAILED:", error);
  }
}

/**
 * One-time data repair for a per-product Black/Antracid photo swap found
 * while investigating product #24 (a customer-visible mixup: selecting
 * "Black" showed the dark-charcoal garment and vice versa). A full visual
 * audit of every product with both a Black and an Antracid
 * `product_color_images` row (60 of the 64 catalog products; the other 4
 * are the archived/legacy "Botox/Sayfyeh" duplicates handled by
 * `repairBotoxSayfyehDuplicates`) confirmed the same swap on exactly three
 * products: 8, 24, and 39. Every other product's Black/Antracid pair was
 * visually verified as correctly assigned.
 *
 * Fix: swap only the `images` JSON between the Black and Antracid rows for
 * products 8, 24, and 39. Idempotent via a marker table, same pattern as
 * `repairSwappedWhiteGreyPhotos`.
 */
export async function repairSwappedBlackAntracidPhotos(
  db: MySql2Database<Record<string, unknown>>,
) {
  const affectedProductIds = [8, 24, 39];

  await db.execute(
    sql.raw(
      "create table if not exists `black_antracid_swap_repairs` (`productId` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select productId from `black_antracid_swap_repairs`"),
  )) as unknown as [{ productId: number }[]];
  const appliedSet = new Set((alreadyApplied[0] ?? []).map((r) => r.productId));

  const rows = (await db.execute(
    sql.raw(
      `select id, productId, colorName, images from \`product_color_images\` where productId in (${affectedProductIds.join(",")}) and colorName in ('Black', 'Antracid')`,
    ),
  )) as unknown as [{ id: number; productId: number; colorName: string; images: unknown }[]];

  const byProduct = new Map<number, { black?: { id: number; images: unknown }; antracid?: { id: number; images: unknown } }>();
  for (const row of rows[0] ?? []) {
    const entry = byProduct.get(row.productId) ?? {};
    if (row.colorName === "Black") entry.black = { id: row.id, images: row.images };
    if (row.colorName === "Antracid") entry.antracid = { id: row.id, images: row.images };
    byProduct.set(row.productId, entry);
  }

  let repairedCount = 0;
  for (const productId of affectedProductIds) {
    if (appliedSet.has(productId)) continue;
    const entry = byProduct.get(productId);
    if (!entry?.black || !entry?.antracid) {
      console.log(
        `[db] Black/Antracid swap repair: product ${productId} missing a Black or Antracid row — skipping`,
      );
      continue;
    }
    try {
      const blackImagesJson = JSON.stringify(entry.black.images ?? []).replace(/'/g, "''");
      const antracidImagesJson = JSON.stringify(entry.antracid.images ?? []).replace(/'/g, "''");

      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${antracidImagesJson}', updatedAt = NOW() where id = ${entry.black.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${blackImagesJson}', updatedAt = NOW() where id = ${entry.antracid.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `insert into \`black_antracid_swap_repairs\` (productId) values (${productId})`,
        ),
      );
      repairedCount++;
      console.log(`[db] Black/Antracid swap repair: swapped photos for product ${productId}`);
    } catch (error) {
      console.error(`[db] Black/Antracid swap repair FAILED for product ${productId}:`, error);
    }
  }
  console.log(`[db] Black/Antracid swap repair: done, ${repairedCount} product(s) repaired this run`);
}

/**
 * One-time rename of the garment color "Antracid" to "Dark Charcoal" to
 * match the factory's own naming. The Arabic label ("\u0631\u0645\u0627\u062f\u064a \u062d\u062f\u064a\u062f\u064a") is
 * intentionally left unchanged — it already reads as a sensible
 * description independent of the old English name.
 *
 * The color name is duplicated as a plain string in three places (no
 * foreign key), so all three must be updated together or the storefront's
 * `resolveColor()` lookup (which matches by exact `name_en`) would stop
 * finding the color for any product still holding the old string:
 *  - `garment_colors.nameEn` (the canonical color list)
 *  - `products.approvedColors` (a JSON string array per product)
 *  - `product_color_images.colorName` (per-color photo rows)
 *
 * Idempotent via a marker row in a dedicated `antracid_rename_repair`
 * table, same pattern as the other repairs above; safe to run on every boot.
 */
export async function renameAntracidToDarkCharcoal(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `antracid_rename_repair` (`id` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select id from `antracid_rename_repair` where id = 1"),
  )) as unknown as [unknown[]];
  if ((alreadyApplied[0] ?? []).length > 0) {
    console.log("[db] Antracid -> Dark Charcoal rename: already applied, skipping");
    return;
  }

  try {
    await db.execute(
      sql.raw(
        "update `garment_colors` set nameEn = 'Dark Charcoal' where nameEn = 'Antracid'",
      ),
    );

    await db.execute(
      sql.raw(
        "update `product_color_images` set colorName = 'Dark Charcoal', updatedAt = NOW() where colorName = 'Antracid'",
      ),
    );

    const productRows = (await db.execute(
      sql.raw(
        "select id, approvedColors from `products` where JSON_CONTAINS(approvedColors, '\"Antracid\"')",
      ),
    )) as unknown as [{ id: number; approvedColors: unknown }[]];

    for (const row of productRows[0] ?? []) {
      const colors = Array.isArray(row.approvedColors) ? (row.approvedColors as string[]) : [];
      const updated = colors.map((c) => (c === "Antracid" ? "Dark Charcoal" : c));
      const updatedJson = JSON.stringify(updated).replace(/'/g, "''");
      await db.execute(
        sql.raw(
          `update \`products\` set approvedColors = '${updatedJson}', updatedAt = NOW() where id = ${row.id}`,
        ),
      );
    }

    await db.execute(sql.raw("insert into `antracid_rename_repair` (id) values (1)"));
    console.log(
      `[db] Antracid -> Dark Charcoal rename: done (garment_colors, ${(productRows[0] ?? []).length} product(s), product_color_images all updated)`,
    );
  } catch (error) {
    console.error("[db] Antracid -> Dark Charcoal rename FAILED:", error);
  }
}

/**
 * One-time repair for a specific, known incident: on 2026-08-31, products
 * 49-64 were correctly imported (their `product_color_images` "White" row
 * genuinely held the white-garment photo and "Grey" held the grey-garment
 * photo). The very next boot after that import ran the legacy
 * `repairSwappedWhiteGreyPhotos` repair above, which — before its
 * `LEGACY_WHITE_GREY_REPAIR_MAX_ID` scope guard existed — blindly swapped
 * the White/Grey images for *every* product not yet in its marker table,
 * including these 16 brand-new, already-correct ones. That flipped their
 * White/Grey photos from correct to wrong (confirmed both by direct pixel
 * inspection and by the classifier's own cost function, which independently
 * picks the *original* pairing as lower-cost/correct).
 *
 * Fix: swap the `images` back for exactly these 16 known-affected products.
 * This mirrors `repairSwappedWhiteGreyPhotos`'s swap logic exactly (same
 * "swap only `images`, keep colorName/sortOrder" approach) but is scoped to
 * this one incident via an explicit id list, not a heuristic, and tracked
 * with its own marker table so it can only ever run once per product.
 */
const MISAPPLIED_WHITE_GREY_PRODUCT_IDS = [
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
];

export async function restoreMisappliedWhiteGreySwap(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `white_grey_misapply_repairs` (`productId` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select productId from `white_grey_misapply_repairs`"),
  )) as unknown as [{ productId: number }[]];
  const appliedSet = new Set((alreadyApplied[0] ?? []).map((r) => r.productId));

  const idList = MISAPPLIED_WHITE_GREY_PRODUCT_IDS.filter((id) => !appliedSet.has(id));
  if (idList.length === 0) {
    console.log("[db] misapplied White/Grey restore: already applied, skipping");
    return;
  }

  const rows = (await db.execute(
    sql.raw(
      `select id, productId, colorName, images from \`product_color_images\` where colorName in ('White', 'Grey') and productId in (${idList.join(",")})`,
    ),
  )) as unknown as [{ id: number; productId: number; colorName: string; images: unknown }[]];

  const byProduct = new Map<number, { white?: { id: number; images: unknown }; grey?: { id: number; images: unknown } }>();
  for (const row of rows[0] ?? []) {
    const entry = byProduct.get(row.productId) ?? {};
    if (row.colorName === "White") entry.white = { id: row.id, images: row.images };
    if (row.colorName === "Grey") entry.grey = { id: row.id, images: row.images };
    byProduct.set(row.productId, entry);
  }

  let repairedCount = 0;
  for (const productId of idList) {
    const entry = byProduct.get(productId);
    const white = entry?.white;
    const grey = entry?.grey;
    if (!white || !grey) {
      console.log(
        `[db] misapplied White/Grey restore: product ${productId} missing a White or Grey row — skipping`,
      );
      continue;
    }
    try {
      const whiteImagesJson = JSON.stringify(white.images ?? []).replace(/'/g, "''");
      const greyImagesJson = JSON.stringify(grey.images ?? []).replace(/'/g, "''");

      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${greyImagesJson}', updatedAt = NOW() where id = ${white.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${whiteImagesJson}', updatedAt = NOW() where id = ${grey.id}`,
        ),
      );
      await db.execute(
        sql.raw(
          `insert into \`white_grey_misapply_repairs\` (productId) values (${productId})`,
        ),
      );
      repairedCount++;
      console.log(`[db] misapplied White/Grey restore: restored product ${productId}`);
    } catch (error) {
      console.error(`[db] misapplied White/Grey restore FAILED for product ${productId}:`, error);
    }
  }
  console.log(`[db] misapplied White/Grey restore: done, ${repairedCount} product(s) restored this run`);
}

/**
 * One-time repair for product 57's photos specifically. Its four
 * `product_color_images` photos render at 1400x788 (landscape), while every
 * other product in the catalog uses a ~1024x1024 square composite. The
 * customer-facing gallery (`ProductPage.jsx`) displays photos in a 4:5
 * portrait box with `object-cover`, so product 57's wide landscape photos
 * get cropped hard on both left and right, cutting into the front/back
 * model shots and producing the broken-looking crop the customer reported.
 *
 * Fix: center-crop each of product 57's 4 photos to a square (cropping
 * width down to match height, i.e. removing equal margins from both
 * sides — verified by visual inspection to keep both the front and back
 * shots fully in frame), re-encode via the same R2/WebP pipeline used
 * everywhere else, and update the 4 `product_color_images` rows in place.
 * Only touches product 57; does not change any other product's photos or
 * any shared display component. Idempotent via a marker table.
 */
export async function cropProduct57PhotosToSquare(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `product57_crop_repair` (`id` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select id from `product57_crop_repair` where id = 1"),
  )) as unknown as [unknown[]];
  if ((alreadyApplied[0] ?? []).length > 0) {
    console.log("[db] product 57 square-crop repair: already applied, skipping");
    return;
  }

  const { isR2Configured, uploadDataUrlToR2 } = await import("./lib/r2");
  if (!isR2Configured()) {
    console.log("[db] product 57 square-crop repair: R2 not configured, skipping");
    return;
  }

  const rows = (await db.execute(
    sql.raw(
      "select id, colorName, images from `product_color_images` where productId = 57",
    ),
  )) as unknown as [{ id: number; colorName: string; images: unknown }[]];

  if ((rows[0] ?? []).length === 0) {
    console.log("[db] product 57 square-crop repair: no rows found, skipping");
    return;
  }

  const sharp = (await import("sharp")).default;

  let croppedCount = 0;
  for (const row of rows[0] ?? []) {
    const images = Array.isArray(row.images) ? (row.images as string[]) : [];
    if (images.length === 0) continue;
    try {
      const newImages: string[] = [];
      for (const url of images) {
        if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
          newImages.push(url);
          continue;
        }
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[db] product 57 square-crop repair: fetch failed for ${url} (${res.status})`);
          newImages.push(url);
          continue;
        }
        const sourceBuffer = Buffer.from(await res.arrayBuffer());
        const meta = await sharp(sourceBuffer).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (!w || !h || w === h) {
          // Already square (or unreadable) — leave untouched.
          newImages.push(url);
          continue;
        }
        const side = Math.min(w, h);
        const left = Math.floor((w - side) / 2);
        const top = Math.floor((h - side) / 2);
        const croppedBuffer = await sharp(sourceBuffer)
          .extract({ left, top, width: side, height: side })
          .webp({ quality: 90 })
          .toBuffer();
        const dataUrl = `data:image/webp;base64,${croppedBuffer.toString("base64")}`;
        const newUrl = await uploadDataUrlToR2(dataUrl, "products");
        newImages.push(newUrl ?? url);
      }
      const newImagesJson = JSON.stringify(newImages).replace(/'/g, "''");
      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${newImagesJson}', updatedAt = NOW() where id = ${row.id}`,
        ),
      );
      croppedCount++;
      console.log(`[db] product 57 square-crop repair: re-cropped ${row.colorName} photo`);
    } catch (error) {
      console.error(`[db] product 57 square-crop repair FAILED for color ${row.colorName}:`, error);
    }
  }

  await db.execute(sql.raw("insert into `product57_crop_repair` (id) values (1)"));
  console.log(`[db] product 57 square-crop repair: done, ${croppedCount} photo(s) re-cropped`);
}

/**
 * Follow-up repair for product 57, superseding the square-crop above. The
 * square crop (cropProduct57PhotosToSquare) was mathematically the loosest
 * possible square crop of the 1400x788 original, but the customer-facing
 * gallery box (`ProductPage.jsx`, `aspect-[4/5]` + `object-cover`) still
 * re-crops ANY square photo down to its center ~63% of width to fit the
 * 4:5 box — so even the squared photo only ever showed a ~630px-wide
 * window of the original 1400px-wide composite, cutting into the design
 * on the back-panel photos.
 *
 * The two panels (front/face around original x[0,712), back/design around
 * x[712,1400)) are ~700px apart at native resolution — farther apart than
 * the 630px window the display box can ever show, so no single crop can
 * keep both a recognizable face and the full back-panel design in frame.
 * Per explicit user direction, this repair biases every crop toward
 * protecting the design/back-panel artwork (the print is the product),
 * accepting that the front-panel face is mostly or fully out of frame.
 *
 * Rather than re-deriving another crop window at runtime, this uses four
 * final 630x788 images (exactly matching the display box's 4:5 aspect, so
 * the box performs zero further cropping) that were hand-verified against
 * the true original artwork bounding box for each color. They ship in the
 * repo at `assets/p57-recrop/` (copied into the runtime image by the
 * Dockerfile) because Black/Dark Charcoal's true 1400x788 pre-crop
 * originals are not recoverable from the currently-live (already-cropped)
 * URLs alone. Idempotent via its own marker table; only touches product 57.
 */
export async function repairProduct57DesignCrop(
  db: MySql2Database<Record<string, unknown>>,
) {
  await db.execute(
    sql.raw(
      "create table if not exists `product57_design_crop_repair` (`id` bigint unsigned primary key, `appliedAt` timestamp not null default (now()))",
    ),
  );

  const alreadyApplied = (await db.execute(
    sql.raw("select id from `product57_design_crop_repair` where id = 1"),
  )) as unknown as [unknown[]];
  if ((alreadyApplied[0] ?? []).length > 0) {
    console.log("[db] product 57 design-crop repair: already applied, skipping");
    return;
  }

  const { isR2Configured, uploadDataUrlToR2 } = await import("./lib/r2");
  if (!isR2Configured()) {
    console.log("[db] product 57 design-crop repair: R2 not configured, skipping");
    return;
  }

  const rows = (await db.execute(
    sql.raw(
      "select id, colorName, images from `product_color_images` where productId = 57",
    ),
  )) as unknown as [{ id: number; colorName: string; images: unknown }[]];

  if ((rows[0] ?? []).length === 0) {
    console.log("[db] product 57 design-crop repair: no rows found, skipping");
    return;
  }

  const ASSET_BY_COLOR: Record<string, string> = {
    White: "white.webp",
    Black: "black.webp",
    Grey: "grey.webp",
    "Dark Charcoal": "dark-charcoal.webp",
  };
  const assetsDir = path.join(process.cwd(), "assets", "p57-recrop");

  let repairedCount = 0;
  for (const row of rows[0] ?? []) {
    const filename = ASSET_BY_COLOR[row.colorName];
    if (!filename) {
      console.log(`[db] product 57 design-crop repair: no local asset mapped for color "${row.colorName}", skipping`);
      continue;
    }
    const assetPath = path.join(assetsDir, filename);
    if (!fs.existsSync(assetPath)) {
      console.error(`[db] product 57 design-crop repair: missing asset file ${assetPath}, skipping ${row.colorName}`);
      continue;
    }
    try {
      const buffer = fs.readFileSync(assetPath);
      const dataUrl = `data:image/webp;base64,${buffer.toString("base64")}`;
      const newUrl = await uploadDataUrlToR2(dataUrl, "products");
      if (!newUrl) {
        console.error(`[db] product 57 design-crop repair: upload failed for ${row.colorName}, skipping`);
        continue;
      }
      const existingImages = Array.isArray(row.images) ? (row.images as string[]) : [];
      const newImages = existingImages.length > 0 ? [newUrl, ...existingImages.slice(1)] : [newUrl];
      const newImagesJson = JSON.stringify(newImages).replace(/'/g, "''");
      await db.execute(
        sql.raw(
          `update \`product_color_images\` set images = '${newImagesJson}', updatedAt = NOW() where id = ${row.id}`,
        ),
      );
      repairedCount++;
      console.log(`[db] product 57 design-crop repair: repaired ${row.colorName} photo`);
    } catch (error) {
      console.error(`[db] product 57 design-crop repair FAILED for color ${row.colorName}:`, error);
    }
  }

  await db.execute(sql.raw("insert into `product57_design_crop_repair` (id) values (1)"));
  console.log(`[db] product 57 design-crop repair: done, ${repairedCount} photo(s) repaired`);
}
