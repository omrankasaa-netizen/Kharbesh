# Kharbesh | خربش Commerce

Premium Lebanese streetwear storefront and operations backend for Kharbesh —
"لبسك بيحكي عنك". Lebanon, but wearable.

## What is included

- Dark editorial React storefront (Anton + IBM Plex Sans Arabic + Rakkas),
  fully bilingual EN/AR with a localStorage cart.
- Product catalog with collections (Politics / Quotes / Rahbaniet), garment
  colors and styles, preorder types, and capacity-limited drops.
- Guest checkout with server-side pricing, color/size validation, and
  transactional stock (`units_sold`) handling.
- Guest order tracking (order number + matching email/phone required).
- Kharbesh 3a Zaw2ak custom-request intake with reference-file upload and
  rights confirmation.
- Kimi OAuth sign-in with httpOnly JWT session cookies.
- Role-based admin panel: dashboard, orders, inventory, customers,
  analytics, and settings.
- Drizzle ORM + MySQL schema, migrations (applied automatically at boot),
  and idempotent seed data.
- API input validation, admin authorization, 2 MB body limit, API rate
  limiting, audit logs on all mutations, and production security headers
  (CSP, X-Frame-Options, nosniff, Referrer-Policy, no-store).

## Routes

- `/` `/shop` `/drop` `/collections` `/collections/:slug` `/product/:id`
- `/cart` `/checkout` `/order/:id` `/track` `/custom`
- `/story` `/faq` `/contact` `/lookbook` `/journal` `/sizing-guide`
  `/archive` `/production-timeline` `/returns-policy` `/shipping-info`
  `/design-philosophy`
- `/login` — Kimi OAuth login
- `/profile` — signed-in customer's orders
- `/admin/dashboard` `/admin/orders` `/admin/inventory` `/admin/customers`
  `/admin/analytics` `/admin/settings` — restricted to `role = admin`

## Commands

```bash
npm install
npm run check        # type-check
npx vitest run       # API validation tests
npm run db:push      # push schema (dev only; production migrates at boot)
npx tsx db/seed.ts   # seed collections, colors, styles, launch products
npm run dev
npm run build
npm start
```

## Environment

`.env` is provided by the platform and intentionally not committed.
See `.env.example` for the required values. Do not commit real credentials.

## Binary assets

Fonts, brand PNGs, and design artwork are not committed as binaries.
`scripts/restore-assets.sh` restores them into `public/assets/` from
`scripts/asset-urls.txt` (URL manifest) — and from an optional
`assets-base64/` mirror tree if one is present. The Dockerfile runs this
automatically during image builds.

## Pre-launch checklist

1. Confirm final prices, stock, sizes, and delivery terms with the team —
   the storefront never promises final price or delivery dates on its own.
2. Test Kimi OAuth with the owner account and confirm the admin role.
3. Test guest checkout, capacity limits, order tracking, custom requests,
   and admin status changes end to end.
4. Add delivery-zone pricing when final courier rates are known.
5. Add a payment provider only after the provider account and compliance
   requirements are confirmed.
6. Run `npm run check`, `npx vitest run`, and `npm run build` before
   publishing.
