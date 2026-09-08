import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression test for the exact bug found in 0007_add_cancelled_order_status.sql:
 * drizzle-orm's migrator (readMigrationFiles in drizzle-orm/migrator.js) splits
 * each migration file's raw text on the literal string "--> statement-breakpoint"
 * and executes every resulting fragment as its own SQL statement
 * (drizzle-orm/mysql-core/dialect.js: `for (const stmt of migration.sql) await
 * tx.execute(sql.raw(stmt))`). A trailing "--> statement-breakpoint" marker with
 * nothing after it (or two markers back-to-back) produces an empty/whitespace-only
 * fragment, which the mysql2 driver rejects with "Query was empty". Because all
 * pending migrations run inside one transaction, that single bad fragment rolls
 * back every migration after it in the same boot — and since api/boot.ts's
 * migrate() call is wrapped in a non-blocking try/catch (by design, so a schema
 * hiccup never takes down the storefront), this failure can silently repeat on
 * every deploy indefinitely until someone reads the logs. This test statically
 * catches that failure mode at CI time, before it ever reaches a boot log.
 */
describe("db migrations", () => {
  const migrationsDir = path.join(__dirname, "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
    entries: { tag: string }[];
  };

  it("has a migration file for every journal entry", () => {
    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
      expect(fs.existsSync(sqlPath), `missing ${sqlPath}`).toBe(true);
    }
  });

  it("never splits into an empty statement on the drizzle statement-breakpoint delimiter", () => {
    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
      const content = fs.readFileSync(sqlPath, "utf-8");
      // Mirrors drizzle-orm/migrator.js's readMigrationFiles() split exactly.
      const statements = content.split("--> statement-breakpoint");
      statements.forEach((stmt, i) => {
        expect(
          stmt.trim().length > 0,
          `${entry.tag}.sql produces an empty statement at split index ${i} ` +
            `(likely a stray leading/trailing "--> statement-breakpoint" marker) ` +
            `— mysql2 rejects empty queries with "Query was empty", which rolls ` +
            `back this migration and every one after it in the same boot`,
        ).toBe(true);
      });
    }
  });
});
