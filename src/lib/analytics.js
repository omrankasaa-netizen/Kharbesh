// Marketing pixel scaffolding — Meta Pixel, TikTok Pixel, and Google
// Analytics 4. Every pixel is OFF by default and only loads if its env var
// is set, so a store with none configured pays zero extra network cost —
// important given the "must stay lightning fast on weak 4G" requirement.
//
// Env vars (set in Railway / .env, never hardcoded):
//   VITE_META_PIXEL_ID   — Meta/Facebook Pixel ID
//   VITE_TIKTOK_PIXEL_ID — TikTok Pixel ID
//   VITE_GA_ID           — Google Analytics 4 measurement ID (G-XXXXXXX)

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID;
const GA_ID = import.meta.env.VITE_GA_ID;

let initialized = false;

/** Injects only the pixels that have an env var configured. Call once, after
 * first paint (see main.tsx) so it never competes with the initial render
 * for bandwidth on slow connections. */
export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (META_PIXEL_ID) {
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  if (TIKTOK_PIXEL_ID) {
    /* eslint-disable */
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (t, e) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.load = function (e, n) {
        var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var o = d.createElement('script');
        o.type = 'text/javascript';
        o.async = !0;
        o.src = i + '?sdkid=' + e + '&lib=' + t;
        var a = d.getElementsByTagName('script')[0];
        a.parentNode.insertBefore(o, a);
      };
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    })(window, document, 'ttq');
    /* eslint-enable */
  }

  if (GA_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }
}

/** Fires a purchase/conversion event on every configured pixel. Call this
 * once, right after an order is successfully created at checkout. */
export function trackPurchase({ orderId, value, currency = 'USD', items = [] } = {}) {
  if (typeof window === 'undefined') return;
  try {
    if (META_PIXEL_ID && window.fbq) {
      window.fbq('track', 'Purchase', { value, currency, content_ids: items.map((i) => i.productId), num_items: items.length });
    }
    if (TIKTOK_PIXEL_ID && window.ttq) {
      window.ttq.track('CompletePayment', { value, currency, content_id: orderId });
    }
    if (GA_ID && window.gtag) {
      window.gtag('event', 'purchase', { transaction_id: orderId, value, currency, items: items.map((i) => ({ item_id: i.productId, item_name: i.productName, quantity: i.quantity, price: i.unitPrice })) });
    }
  } catch {
    // Never let a pixel failure break the checkout success flow.
  }
}
