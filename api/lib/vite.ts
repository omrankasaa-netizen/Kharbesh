import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Every file under /assets is Vite content-hash-named (e.g.
  // index-DhEiyuVx.js) — the hash changes whenever the content changes, so
  // it's safe to tell browsers and Cloudflare's edge to cache it for a
  // full year without ever revalidating. Without this, no Cache-Control
  // was sent at all and Cloudflare fell back to its own default 4-hour
  // browser TTL, forcing needless re-fetches of the same JS/CSS/fonts on
  // every return visit — expensive on Lebanon's slower/metered 4G.
  // index.html itself is deliberately left alone (no long cache) so a new
  // deploy is picked up on the next navigation instead of being stuck
  // behind a stale cached shell.
  app.use("/assets/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Explicit 200: this branch serves a real, valid SPA route (e.g.
    // /shop, /admin) via client-side routing — it's not actually an
    // error. Without an explicit status, Hono's app.notFound() context
    // defaults the response to 404, which is wrong for search engines,
    // uptime/status-code monitors, and any cache layer (e.g. Cloudflare)
    // that treats 4xx responses differently from 200s.
    return c.html(content, 200);
  });
}
