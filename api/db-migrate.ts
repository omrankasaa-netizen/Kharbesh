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
