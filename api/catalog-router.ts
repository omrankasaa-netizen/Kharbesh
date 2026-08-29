import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  listCollections,
  listGarmentColors,
  listGarmentStyles,
  listProductColorImages,
  listProducts,
} from "./queries/catalog";

const idParam = z.string().regex(/^\d+$/, "Invalid id");

export const catalogRouter = createRouter({
  products: publicQuery.query(() => listProducts()),
  collections: publicQuery.query(() => listCollections()),
  garmentColors: publicQuery.query(() => listGarmentColors()),
  garmentStyles: publicQuery.query(() => listGarmentStyles()),
  // Public read of per-color product photos — shoppers need these to see the
  // correct garment photo when they pick a color on the storefront. Writes
  // stay staff-gated in admin-router.ts; this is read-only and the data is
  // already fully public-facing (it's shown directly on product pages).
  productColorImages: publicQuery
    .input(z.object({ productId: idParam }))
    .query(({ input }) => listProductColorImages(Number(input.productId))),
});
