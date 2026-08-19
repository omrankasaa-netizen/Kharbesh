/**
 * khClient — drop-in replacement for the Base44 SDK client.
 *
 * The ported storefront UI calls `base44.entities.*` / `base44.auth.*` /
 * `base44.integrations.*`. This module exposes the exact same surface, but
 * every call goes to our own tRPC backend. Security rules live server-side:
 * admin lists/updates are role-gated, order tracking requires a matching
 * contact, and prices are always taken from the database.
 */
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

/* In the sandbox preview, deploy_website rewrites this placeholder to a
   proxy path pointing at the backend running on that port. Locally (npm run
   dev), the placeholder stays literal, so we fall back to the relative path
   that Vite's dev-server plugin already proxies to the same-process API. */
const API_BASE = (() => {
  const placeholder = '__PORT_8090__';
  return placeholder.startsWith('__') ? '' : placeholder;
})();

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: `${API_BASE}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: 'include' });
      },
    }),
  ],
});

const empty = (v) => (v === '' || v == null ? undefined : v);

/* Product/collection images are stored as root-relative paths (e.g.
   "/assets/designs/foo.jpg"). The backend serves the built client bundle
   (including /assets) as static files, so routing an image through the
   same API_BASE the tRPC client uses works everywhere: locally it stays a
   plain relative path, on Railway API_BASE is empty so the path is still
   root-relative and correct, and in the sandbox preview API_BASE is the
   proxy prefix deploy_website rewrote in, so the image resolves under that
   nested path instead of 404ing against the domain root. */
const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.startsWith('/')) return url;
  return `${API_BASE}${url}`;
};
const resolveAssetUrls = (urls) => (Array.isArray(urls) ? urls.map(resolveAssetUrl) : urls);

const TONES = ['subtle', 'bold', 'sarcastic', 'clean', 'colorful'];

function toUiUser(u) {
  if (!u) return null;
  return {
    id: String(u.id),
    full_name: u.name ?? '',
    email: u.email ?? '',
    role: u.role ?? 'user',
    avatar: u.avatar ?? null,
  };
}

let meCache;
export async function cachedMe(fresh = false) {
  if (!fresh && meCache !== undefined) return meCache;
  try {
    meCache = toUiUser(await client.auth.me.query());
  } catch {
    meCache = null;
  }
  return meCache;
}

/** Downscale an image file client-side and return a data URL. */
async function fileToDataUrl(file, maxDim = 1400, quality = 0.85) {
  const readAs = (f) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  if (!file.type?.startsWith('image/')) {
    if (file.size > 1_400_000) throw new Error('File too large (max ~1MB).');
    return readAs(file);
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
    return canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality);
  } catch {
    if (file.size > 1_400_000) throw new Error('File too large (max ~1MB).');
    return readAs(file);
  }
}

export const kh = {
  entities: {
    Product: {
      /** Public catalog for visitors; full catalog (incl. drafts) for admins. */
      async list() {
        const me = await cachedMe();
        let rows;
        if (me?.role === 'admin') {
          try {
            rows = await client.admin.productsAll.query();
          } catch {
            /* fall through to public list */
          }
        }
        if (!rows) rows = await client.catalog.products.query();
        return (rows || []).map((p) => ({ ...p, images: resolveAssetUrls(p.images) }));
      },
      update: (id, data) =>
        client.admin.updateProduct.mutate({ id: String(id), data }),
    },

    Order: {
      /** Admin-only: every order. Server enforces the admin role. */
      list: () => client.admin.orders.query(),

      /**
       * filter({ order_number, contact }) → guest tracking (server verifies
       * the contact matches the order). filter({ email }) → the signed-in
       * user's own orders (email comes from the session, never the client).
       */
      async filter(criteria = {}) {
        if (criteria.order_number) {
          const o = await client.orders.track.query({
            orderNumber: criteria.order_number,
            contact: criteria.contact ?? '',
          });
          return o ? [o] : [];
        }
        return client.orders.mine.query();
      },

      get: (id) => client.orders.get.query({ id: String(id) }),

      /** Prices, order number and totals are computed server-side. */
      create: (data) =>
        client.orders.create.mutate({
          email: data.email,
          phone: data.phone,
          fullName: data.full_name,
          shippingAddress: data.shipping_address,
          city: data.city,
          country: data.country,
          notes: empty(data.notes),
          language: data.language === 'ar' ? 'ar' : 'en',
          items: (data.items ?? []).map((i) => ({
            productId: String(i.productId),
            color: i.color,
            size: i.size,
            quantity: i.quantity,
          })),
        }),

      update: (id, data) =>
        client.admin.updateOrderStatus.mutate({ id: String(id), status: data.status }),
    },

    Collection: {
      list: async () => {
        const rows = await client.catalog.collections.query();
        return (rows || []).map((c) => ({ ...c, cover_image: resolveAssetUrl(c.cover_image) }));
      },
    },
    GarmentColor: { list: () => client.catalog.garmentColors.query() },
    GarmentStyle: { list: () => client.catalog.garmentStyles.query() },

    CustomProject: {
      /** Admin-only list. */
      list: () => client.admin.customRequests.query(),
      create: (data) =>
        client.customRequests.submit.mutate({
          name: data.name,
          email: data.email,
          phone: empty(data.phone),
          phrase: data.phrase,
          story: empty(data.story),
          language: data.language === 'ar' ? 'ar' : 'en',
          recipient: empty(data.recipient),
          occasion: empty(data.occasion),
          tone: TONES.includes(data.tone) ? data.tone : undefined,
          garment: empty(data.garment),
          color: empty(data.color),
          size: empty(data.size),
          quantity: Number(data.quantity) || 1,
          placement: empty(data.placement),
          needed_by: empty(data.needed_by),
          notes: empty(data.notes),
          reference_files: data.reference_files?.length ? data.reference_files : undefined,
          rights_confirmed: data.rights_confirmed ?? data.rights ?? false,
        }),
    },

    User: { list: () => client.admin.users.query() },
  },

  auth: {
    me: () => cachedMe(true),
    async logout() {
      try {
        await client.auth.logout.mutate();
      } catch {
        /* session may already be gone */
      }
      meCache = null;
    },
    async isAuthenticated() {
      return (await cachedMe()) != null;
    },
    redirectToLogin(returnTo) {
      const target = returnTo || window.location.href;
      window.location.href = `/login?returnTo=${encodeURIComponent(target)}`;
    },
  },

  integrations: {
    Core: {
      /** Reference uploads are stored as downscaled data URLs. */
      UploadFile: async ({ file }) => ({ file_url: await fileToDataUrl(file) }),
    },
  },
};

// The ported UI imports `{ base44 }` — keep that name working 1:1.
export const base44 = kh;
