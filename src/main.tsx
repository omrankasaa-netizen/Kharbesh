import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import { initAnalytics, initMetaEarly } from '@/lib/analytics'
import './index.css'
import App from './App.jsx'

/**
 * Only anchor the router to a basename when the entry document was hit by
 * its literal filename ("/.../index.html") — the signature of a sandbox
 * preview proxy serving one static file with no server-side SPA fallback.
 * Real app routes ("/shop", "/story", ...) never end in ".html", so a
 * normal domain deploy with server-side fallback routing (see boot.ts's
 * serveStaticFiles) is completely unaffected and keeps basename "" —
 * deep links to any route still resolve exactly as before.
 */
const basename = window.location.pathname.endsWith('/index.html')
  ? window.location.pathname
  : ''

// Defer the non-Meta pixel scripts (TikTok/GA) until after the first paint so
// they never compete with the initial render for bandwidth on slow
// connections (4G Lebanon). Meta is deliberately NOT deferred — see below.
if (typeof window !== 'undefined') {
  window.requestIdleCallback ? window.requestIdleCallback(initAnalytics) : window.setTimeout(initAnalytics, 1500)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TRPCProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </TRPCProvider>
  </StrictMode>,
)

// Meta boots in the SAME task as the initial render — before any route or
// product-page effect can fire PageView/ViewContent. Those landing events are
// the ones carrying fbclid from ad clicks; deferring the pixel past them
// (especially on Safari/FB-in-app WebKit, no requestIdleCallback) silently
// dropped them and showed up in Events Manager as low fbc/CAPI coverage.
initMetaEarly()
