import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // `products` has several wide TEXT/JSON columns (bilingual
    // descriptions, care, measurements, images array). MySQL's filesort
    // copies the full row into the sort buffer for "ORDER BY sortOrder",
    // and once enough of those catalog rows exist, the row set can
    // exceed the server's default sort_buffer_size and fail with
    // ER_OUT_OF_SORTMEMORY on every products list query. Raise it
    // per-connection so this pool always has enough room to sort,
    // independent of catalog size or row width.
    const pool = mysql.createPool({
      uri: env.databaseUrl,
      connectionLimit: 10,
    });
    // mysql2/promise's pool 'connection' event hands back the raw
    // callback-style connection, not the promise wrapper -- use
    // .promise() to get an awaitable query method on it.
    pool.on("connection", (connection) => {
      connection
        .promise()
        .query("SET SESSION sort_buffer_size = 8388608")
        .catch((error: unknown) => {
          console.error("[db] failed to raise sort_buffer_size on new connection:", error);
        });
    });
    instance = drizzle({
      client: pool,
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}
