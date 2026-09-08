import { lazy } from 'react';

/**
 * Vite fingerprints every route chunk with a content hash, and the build
 * wipes out old chunk files each time it runs (`emptyOutDir: true`). So any
 * tab that's been open since before the latest deploy — or a request that
 * hits a transient drop on weak 4G — can fail to fetch a lazy route chunk
 * ("Failed to fetch dynamically imported module" / ChunkLoadError). With
 * plain `React.lazy()` and no error boundary around it, that surfaces to
 * the visitor as a stuck spinner or a blank screen that only a manual
 * refresh fixes — the exact "need to refresh twice" symptom on slow
 * connections and right after a deploy.
 *
 * `lazyRetry` wraps `React.lazy()` so most transient failures resolve
 * without the user noticing: it retries the import a couple of times first
 * (covers a dropped 4G packet or a slow/flaky request), and only if every
 * retry still fails does it force exactly one full page reload to fetch
 * the current build's index.html + chunk hashes — automating what the
 * user's manual refresh already does. The sessionStorage flag caps this at
 * one automatic reload per failure so a genuinely broken deploy doesn't
 * reload-loop the tab.
 */
const RELOAD_FLAG = 'kh:chunk-reload-attempted';

export function lazyRetry(importFn, retries = 2, delayMs = 400) {
  return lazy(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await importFn();
        try {
          sessionStorage.removeItem(RELOAD_FLAG);
        } catch {
          // sessionStorage unavailable (private mode etc.) — harmless to skip.
        }
        return mod;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }

    try {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        // The reload is already underway — never resolve so React doesn't
        // try to render with a missing module.
        return new Promise(() => {});
      }
    } catch {
      // sessionStorage unavailable — fall through and surface the error.
    }

    throw lastErr;
  });
}
