import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { createGoogleOAuthCallbackHandler } from "./google/auth";
import { createDriveOAuthCallbackHandler } from "./google/driveAuth";
import { Paths } from "@contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 300;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip") ?? forwarded ?? "local";
}

app.use("/api/*", async (c, next) => {
  const now = Date.now();
  const key = clientKey(c.req.raw);
  const bucket = rateLimitBuckets.get(key);
  const current = bucket && bucket.resetAt > now
    ? bucket
    : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  current.count += 1;
  rateLimitBuckets.set(key, current);

  if (rateLimitBuckets.size > 5000) {
    for (const [bucketKey, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
  }

  if (current.count > RATE_LIMIT_MAX) {
    return c.json({ error: "Too many requests. Please try again shortly." }, 429);
  }

  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});

if (env.isProduction) {
  app.use("*", async (c, next) => {
    await next();
    c.header("Content-Security-Policy", [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "));
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  });
}

app.use(
  bodyLimit({
    maxSize: 10 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "Image too large. Please use a smaller photo." }, 413),
  }),
);
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.get(Paths.googleOauthCallback, createGoogleOAuthCallbackHandler());
app.get(Paths.driveOauthCallback, createDriveOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    // tRPC's default error formatter strips driver-level detail before it
    // reaches the client, so log the real underlying error (and its
    // .cause, where drizzle attaches the raw MySQL driver error) here.
    // Otherwise failures are invisible in both the API response and the
    // deploy logs, which made a prior production bug nearly undiagnosable.
    onError: ({ path, error }) => {
      console.error(`[trpc] ${path ?? "<no-path>"} failed:`, error);
      if (error.cause) console.error("[trpc] cause:", error.cause);
    },
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");

  // Apply pending schema migrations at boot. The runtime environment has
  // private-link access to the database; failures are logged but do not
  // block the static storefront from serving.
  try {
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const { getDb } = await import("./queries/connection");
    const { seedAlreadyAppliedMigrations, repairMigration0002Gaps, repairMislabeledAntracidPhotos } = await import(
      "./db-migrate"
    );
    // Runs first and unconditionally: this database previously ended up
    // with migration 0002 marked "applied" while some of its statements
    // (the `products.costPriceCents` / `orders.*` ALTER TABLEs) never
    // actually ran, which made every full-table read on `products` throw
    // and silently blanked the storefront and admin product list. This
    // check-then-patch repair is idempotent — every statement inside it is
    // gated on "does this column/table already exist?" — so it's safe to
    // run on every boot, including on databases that never had the gap.
    await repairMigration0002Gaps(getDb());
    await seedAlreadyAppliedMigrations(getDb(), "db/migrations");
    await migrate(getDb(), { migrationsFolder: "db/migrations" });
    await repairMislabeledAntracidPhotos(getDb());
    console.log("[db] migrations applied.");
  } catch (error) {
    console.error("[db] migration step failed:", error);
  }

  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
