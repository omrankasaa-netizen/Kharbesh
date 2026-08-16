import { createRouter, publicQuery } from "./middleware";
import {
  listCollections,
  listGarmentColors,
  listGarmentStyles,
  listProducts,
} from "./queries/catalog";

export const catalogRouter = createRouter({
  products: publicQuery.query(() => listProducts()),
  collections: publicQuery.query(() => listCollections()),
  garmentColors: publicQuery.query(() => listGarmentColors()),
  garmentStyles: publicQuery.query(() => listGarmentStyles()),
});
