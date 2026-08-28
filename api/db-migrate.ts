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
 * One-time data repair for a Local Import color-guessing bug (fixed in the
 * same change that adds this function — see api/lib/garmentColorClassifier.ts
 * and src/lib/localGarmentColorClassifier.js). The old classifier averaged
 * the full center-torso band, so a bold dark print graphic could drag a
 * genuinely white shirt's average pixel color toward the "Antracid" anchor.
 * Four already-imported products ended up with their one real photoshoot
 * photo stored under colorName "Antracid" when the shirt in the photo is
 * actually white. This is idempotent — it only acts on the exact rows still
 * in the bad state (an Antracid row present, no White row yet), so it is
 * safe to run on every boot and a no-op once applied.
 */
export async function repairMislabeledAntracidPhotos(
  db: MySql2Database<Record<string, unknown>>,
) {
  const affectedProductIds = [26, 27, 29, 31];
  for (const productId of affectedProductIds) {
    try {
      const antracidRows = (await db.execute(
        sql.raw(
          `select id, images from \`product_color_images\` where productId = ${productId} and colorName = 'Antracid'`,
        ),
      )) as unknown as [{ id: number; images: unknown }[]];
      const antracidRow = (antracidRows[0] ?? [])[0];
      if (!antracidRow) continue;

      const whiteRows = (await db.execute(
        sql.raw(
          `select id, images from \`product_color_images\` where productId = ${productId} and colorName = 'White'`,
        ),
      )) as unknown as [{ id: number; images: unknown }[]];
      const whiteRow = (whiteRows[0] ?? [])[0];

      console.log(
        `[db] DIAGNOSTIC product ${productId} — Antracid row id=${antracidRow.id} images=${JSON.stringify(antracidRow.images)}; White row id=${whiteRow?.id ?? "(none)"} images=${JSON.stringify(whiteRow?.images ?? null)}`,
      );

      // A prior partial run (e.g. product creation itself, or the earlier
      // version of this repair) already seeded an EMPTY White row for
      // these products, which made the earlier "any White row exists ->
      // skip" check silently no-op forever. Only skip when the White row
      // already has real images; an empty one is safe (and correct) to
      // fill in with the real photo currently sitting under Antracid.
      const existingWhiteImages = Array.isArray(whiteRow?.images)
        ? (whiteRow!.images as unknown[])
        : [];
      if (whiteRow && existingWhiteImages.length > 0) {
        console.log(
          `[db] product ${productId} already has a non-empty White color-image row — leaving both rows untouched pending manual review.`,
        );
        continue;
      }

      const antracidImagesJson = JSON.stringify(antracidRow.images ?? []).replace(
        /'/g,
        "''",
      );

      if (whiteRow) {
        await db.execute(
          sql.raw(
            `update \`product_color_images\` set images = '${antracidImagesJson}', updatedAt = NOW() where id = ${whiteRow.id}`,
          ),
        );
      } else {
        await db.execute(
          sql.raw(
            `insert into \`product_color_images\` (productId, colorName, images, sortOrder, createdAt, updatedAt) values (${productId}, 'White', '${antracidImagesJson}', 0, NOW(), NOW())`,
          ),
        );
      }

      await db.execute(
        sql.raw(`delete from \`product_color_images\` where id = ${antracidRow.id}`),
      );
      console.log(
        `[db] repaired mislabeled color photo for product ${productId}: moved real photo from Antracid row into White row`,
      );
    } catch (error) {
      console.error(`[db] FAILED to repair color label for product ${productId}:`, error);
    }
  }
}
