import { z } from "zod";
import { createRouter, staffQuery, adminQuery, superAdminQuery } from "./middleware";
import { uploadDataUrlToR2 } from "./lib/r2";
import { listLoyaltyAccounts, adminUpdateLoyaltyAccount } from "./queries/loyalty";
import { getSettings } from "./queries/settings";
import {
  listUsers,
  updateProduct,
  createProduct,
  bulkCreateProducts,
  deleteProduct,
  hardDeleteProduct,
  bulkUpdateProductStatus,
  bulkHardDeleteProducts,
  listAuditLogs,
} from "./queries/admin";
import { getDriveConnectionStatus, disconnectDrive } from "./queries/driveConnection";
import { scanDriveFolder, commitDriveImport } from "./queries/driveImport";
import {
  listAllProducts,
  createGarmentColor,
  updateGarmentColor,
  deleteGarmentColor,
  reorderGarmentColors,
  createGarmentStyle,
  updateGarmentStyle,
  deleteGarmentStyle,
  listProductColorImages,
  upsertProductColorImages,
  deleteProductColorImages,
} from "./queries/catalog";
import {
  listAllOrders,
  updateOrderStatus,
  hardDeleteOrder,
  sendOrderFollowupEmail,
  markHandedToCourier,
  markCashCollected,
} from "./queries/orders";
import {
  listAllCustomRequests,
  updateCustomRequestStatus,
} from "./queries/customRequests";
import { listStaff, upsertStaff, removeStaff } from "./queries/staff";
import {
  listBlankStock,
  upsertStockVariant,
  adjustStock,
  listStockMovements,
} from "./queries/inventory";
import {
  listFactoryOrders,
  generatePrintJobFromOrders,
  createRestockRequest,
  markFactoryOrderSent,
  markFactoryOrderFulfilled,
  cancelFactoryOrder,
} from "./queries/factory";
import {
  getUnitCosts,
  updateUnitCosts,
  getGarmentCosts,
  upsertGarmentCost,
  listOverheadExpenses,
  addOverheadExpense,
  deleteOverheadExpense,
  getFinancialSummary,
  codOutstandingByCourier,
  getProfitShares,
  updateProfitShares,
  listFactoryPayments,
  addFactoryPayment,
  deleteFactoryPayment,
  getFactoryPayable,
  listProductMargins,
  updateProductCost,
} from "./queries/financials";
import {
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "./queries/promotions";

const idParam = z.string().regex(/^\d+$/, "Invalid id");
const productType = z.enum(["tee", "hoodie", "accessory"]);
const discountValueType = z.enum(["percent", "fixed"]);

/** A percent discount above 100% would pay the customer to order — capped
 *  here on create (type+value are both present) and again in the query
 *  layer on update, where type/value can arrive in separate patches. */
const percentWithin100 = (data: { type?: string; value?: number }, ctx: z.RefinementCtx) => {
  if (data.type === "percent" && data.value != null && data.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Percent discounts can't exceed 100.",
    });
  }
};

/** Maps query-layer business errors to messages that survive tRPC's
 *  production error masking. */
const FRIENDLY_ERRORS: Record<string, string> = {
  PERCENT_TOO_HIGH: "Percent discounts can't exceed 100.",
  NO_ORDERS_FOUND: "No orders matched that selection.",
  ALL_ORDERS_ALREADY_QUEUED: "Every selected order is already in a print job.",
};

function rethrowFriendly(err: unknown): never {
  if (err instanceof Error && FRIENDLY_ERRORS[err.message]) {
    throw new Error(FRIENDLY_ERRORS[err.message]);
  }
  throw err;
}

const promoCodeFields = {
  code: z.string().min(1).max(40),
  type: discountValueType,
  value: z.number().min(0).max(1_000_000),
  min_order: z.number().min(0).max(1_000_000).nullable().optional(),
  max_uses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  active: z.boolean().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
};

const discountFields = {
  name_en: z.string().min(1).max(160),
  name_ar: z.string().max(160).nullable().optional(),
  type: discountValueType,
  value: z.number().min(0).max(1_000_000),
  applies_to: z.enum(["all", "product_type", "collection"]).optional(),
  applies_value: z.string().max(160).nullable().optional(),
  active: z.boolean().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
};

const campaignFields = {
  title_en: z.string().min(1).max(200),
  title_ar: z.string().max(200).nullable().optional(),
  subtitle_en: z.string().max(300).nullable().optional(),
  subtitle_ar: z.string().max(300).nullable().optional(),
  cta_label_en: z.string().max(80).nullable().optional(),
  cta_label_ar: z.string().max(80).nullable().optional(),
  link_url: z.string().max(255).nullable().optional(),
  promo_code_id: z.string().nullable().optional(),
  discount_id: z.string().nullable().optional(),
  active: z.boolean().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
};

const productFields = {
  name_en: z.string().min(1).max(180),
  name_ar: z.string().max(180).nullable(),
  phrase_en: z.string().max(255).nullable(),
  phrase_ar: z.string().max(255).nullable(),
  payoff_en: z.string().max(255).nullable(),
  description_en: z.string().nullable(),
  description_ar: z.string().nullable(),
  collection_name: z.string().max(160).nullable(),
  mood: z.string().max(120).nullable(),
  product_type: productType,
  garment_style: z.string().max(120).nullable(),
  fit_en: z.string().max(180).nullable(),
  care_en: z.string().nullable(),
  care_ar: z.string().nullable(),
  measurements_en: z.string().nullable(),
  approved_colors: z.array(z.string()),
  sizes: z.array(z.string()),
  placement: z.string().max(180).nullable(),
  price: z.number().min(0).max(1_000_000),
  compare_at_price: z.number().min(0).max(1_000_000).nullable(),
  images: z.array(z.string()),
  print_file_url: z.string().max(500).nullable(),
  status: z.enum(["active", "draft", "archived"]),
  preorder_type: z.enum(["open_until", "quantity_target", "limited_quantity", "always_on"]),
  preorder_close_date: z.string().max(10).nullable(),
  preorder_capacity: z.number().int().min(0).max(1_000_000).nullable(),
  units_sold: z.number().int().min(0).max(1_000_000),
  estimated_production_days: z.number().int().min(0).max(365),
  estimated_dispatch_window: z.string().max(120).nullable(),
  drop_name: z.string().max(160).nullable(),
  sort_order: z.number().int(),
};
const productPatchSchema = z.object(productFields).partial();

export const adminRouter = createRouter({
  // ── Catalog: staff can manage products, orders, and custom requests ──────
  productsAll: staffQuery.query(() => listAllProducts()),

  createProduct: staffQuery
    .input(productPatchSchema.required({ name_en: true, product_type: true }))
    .mutation(({ ctx, input }) => createProduct(input, ctx.user.id)),

  /** Bulk Import page: creates many products (each with its own color photos) in one call. */
  bulkCreateProducts: staffQuery
    .input(
      z.object({
        items: z
          .array(
            z.object({
              product: productPatchSchema.required({ name_en: true, product_type: true }),
              colorImages: z.record(z.string(), z.array(z.string())).optional(),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(({ ctx, input }) => bulkCreateProducts(input.items, ctx.user.id)),

  // — Import from Drive: one-time Drive connect + folder scan/commit —
  driveStatus: staffQuery.query(() => getDriveConnectionStatus()),
  driveDisconnect: staffQuery.mutation(() => disconnectDrive()),
  driveScan: staffQuery
    .input(z.object({ folderLink: z.string().min(1).max(500) }))
    .mutation(({ input }) => scanDriveFolder(input.folderLink)),
  driveCommit: staffQuery
    .input(
      z.object({
        items: z
          .array(
            z.object({
              folderId: z.string(),
              nameEn: z.string().min(1).max(180),
              nameAr: z.string().max(180).nullable().optional(),
              productType: productType,
              price: z.number().min(0).max(1_000_000),
              sizes: z.array(z.string()),
              status: z.enum(["draft", "active"]),
              garmentStyle: z.string().max(120).nullable().optional(),
              collectionName: z.string().max(160).nullable().optional(),
              colorFiles: z.record(z.string(), z.string()),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(({ ctx, input }) => commitDriveImport(input.items, ctx.user.id)),

  updateProduct: staffQuery
    .input(z.object({ id: idParam, data: productPatchSchema }))
    .mutation(({ ctx, input }) => updateProduct(Number(input.id), input.data, ctx.user.id)),

  deleteProduct: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => deleteProduct(Number(input.id), ctx.user.id)),

  /** Permanent delete — super_admin only. Staff use `deleteProduct` (archive). */
  hardDeleteProduct: superAdminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => hardDeleteProduct(Number(input.id), ctx.user.id)),

  /** Products list selection toolbar: set many products' status at once. */
  bulkUpdateProductStatus: staffQuery
    .input(z.object({ ids: z.array(idParam).min(1).max(500), status: z.enum(["active", "draft", "archived"]) }))
    .mutation(({ ctx, input }) => bulkUpdateProductStatus(input.ids.map(Number), input.status, ctx.user.id)),

  /** Products list selection toolbar: permanent batch delete — super_admin only. */
  bulkHardDeleteProducts: superAdminQuery
    .input(z.object({ ids: z.array(idParam).min(1).max(500) }))
    .mutation(({ ctx, input }) => bulkHardDeleteProducts(input.ids.map(Number), ctx.user.id)),

  /**
   * Uploads a product photo (sent as a base64 data URL) to R2 and returns
   * its public CDN URL. If R2 isn't configured, or the upload fails for any
   * reason, returns the original data URL unchanged so callers never break.
   */
  uploadImage: staffQuery
    .input(z.object({ dataUrl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const url = await uploadDataUrlToR2(input.dataUrl);
      return { url: url ?? input.dataUrl };
    }),

  orders: staffQuery
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(({ input }) => listAllOrders(input?.limit, input?.offset)),

  updateOrderStatus: staffQuery
    .input(
      z.object({
        id: idParam,
        status: z.enum([
          "order_received",
          "preorder_confirmed",
          "in_production",
          "being_printed",
          "preparing_shipment",
          "on_the_way",
          "delivered",
          "needs_attention",
          "cancelled",
        ]),
      }),
    )
    .mutation(({ ctx, input }) => updateOrderStatus(Number(input.id), input.status, ctx.user.id)),

  /** Permanent delete — super_admin only. There is no soft-delete for orders. */
  hardDeleteOrder: superAdminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => hardDeleteOrder(Number(input.id), ctx.user.id)),

  /** Manual "Send follow-up" button on an order row — no automatic timer. */
  sendOrderFollowupEmail: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => sendOrderFollowupEmail(Number(input.id))),

  /** Courier handoff: records which courier company took the parcel. */
  markHandedToCourier: staffQuery
    .input(z.object({ id: idParam, courier_name: z.string().trim().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await markHandedToCourier(Number(input.id), input.courier_name, ctx.user.id);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  /** COD settlement: the courier paid us this order's cash. */
  markCashCollected: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await markCashCollected(Number(input.id), ctx.user.id);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  customRequests: staffQuery.query(() => listAllCustomRequests()),

  updateCustomRequestStatus: staffQuery
    .input(
      z.object({
        id: idParam,
        status: z.enum([
          "new_request",
          "review",
          "quote_sent",
          "deposit_paid",
          "designing",
          "customer_review",
          "revision",
          "approved",
          "balance_due",
          "production",
          "shipped",
          "closed",
        ]),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateCustomRequestStatus(Number(input.id), input.status, ctx.user.id),
    ),

  // ── Inventory: staff can view/adjust blank stock ──────────────────────────
  blankStock: staffQuery.query(() => listBlankStock()),

  upsertStockVariant: staffQuery
    .input(
      z.object({
        product_type: productType,
        color: z.string().min(1).max(80),
        size: z.string().min(1).max(20),
        quantity_on_hand: z.number().int().min(0).max(100_000).optional(),
        low_stock_threshold: z.number().int().min(0).max(100_000).optional(),
      }),
    )
    .mutation(({ ctx, input }) => upsertStockVariant(input, ctx.user.id)),

  adjustStock: staffQuery
    .input(
      z.object({
        id: idParam,
        delta: z.number().int().min(-100_000).max(100_000),
        type: z.enum(["restock", "consumed", "adjustment"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      adjustStock({ id: Number(input.id), delta: input.delta, type: input.type, note: input.note }, ctx.user.id),
    ),

  stockMovements: staffQuery
    .input(z.object({ stockId: idParam.optional() }).optional())
    .query(({ input }) => listStockMovements(input?.stockId ? Number(input.stockId) : undefined)),

  // ── Per-color product photos: staff manage from the product editor ──────
  productColorImages: staffQuery
    .input(z.object({ productId: idParam }))
    .query(({ input }) => listProductColorImages(Number(input.productId))),

  upsertProductColorImages: staffQuery
    .input(z.object({ productId: idParam, colorName: z.string().min(1).max(80), images: z.array(z.string()) }))
    .mutation(({ input }) => upsertProductColorImages(Number(input.productId), input.colorName, input.images)),

  deleteProductColorImages: staffQuery
    .input(z.object({ productId: idParam, colorName: z.string().min(1).max(80) }))
    .mutation(({ input }) => deleteProductColorImages(Number(input.productId), input.colorName)),

  // ── Factory: staff can build print jobs / restock requests ────────────────
  factoryOrders: staffQuery.query(() => listFactoryOrders()),

  generatePrintJob: staffQuery
    .input(z.object({ orderIds: z.array(idParam).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await generatePrintJobFromOrders(input.orderIds.map(Number), ctx.user.id);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  createRestockRequest: staffQuery
    .input(
      z.object({
        items: z
          .array(
            z.object({
              product_type: productType,
              color: z.string().min(1).max(80),
              size: z.string().min(1).max(20),
              quantity: z.number().int().min(1).max(100_000),
            }),
          )
          .min(1),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(({ ctx, input }) => createRestockRequest(input.items, input.notes, ctx.user.id)),

  markFactoryOrderSent: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => markFactoryOrderSent(Number(input.id), ctx.user.id)),

  markFactoryOrderFulfilled: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => markFactoryOrderFulfilled(Number(input.id), ctx.user.id)),

  cancelFactoryOrder: staffQuery
    .input(z.object({ id: idParam }))
    .mutation(({ ctx, input }) => cancelFactoryOrder(Number(input.id), ctx.user.id)),

  // ── Admin tier: users, audit log, non-sensitive site management ──────────
  users: adminQuery.query(() => listUsers()),

  auditLogs: adminQuery.query(() => listAuditLogs()),

  createGarmentColor: adminQuery
    .input(z.object({ name_en: z.string().min(1).max(80), name_ar: z.string().max(80).nullable().optional(), hex: z.string().min(3).max(9) }))
    .mutation(({ input }) => createGarmentColor(input)),

  updateGarmentColor: adminQuery
    .input(z.object({ id: idParam, name_en: z.string().min(1).max(80).optional(), name_ar: z.string().max(80).nullable().optional(), hex: z.string().min(3).max(9).optional() }))
    .mutation(({ input }) => updateGarmentColor(Number(input.id), input)),

  deleteGarmentColor: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteGarmentColor(Number(input.id))),

  reorderGarmentColors: adminQuery
    .input(z.object({ ids: z.array(idParam) }))
    .mutation(({ input }) => reorderGarmentColors(input.ids.map(Number))),

  createGarmentStyle: adminQuery
    .input(z.object({
      name_en: z.string().min(1).max(120),
      name_ar: z.string().max(120).nullable().optional(),
      price_modifier: z.number().optional(),
      sizes: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => createGarmentStyle(input)),

  updateGarmentStyle: adminQuery
    .input(z.object({
      id: idParam,
      name_en: z.string().min(1).max(120).optional(),
      name_ar: z.string().max(120).nullable().optional(),
      price_modifier: z.number().optional(),
      sizes: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => updateGarmentStyle(Number(input.id), input)),

  deleteGarmentStyle: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteGarmentStyle(Number(input.id))),

  // ── Admin tier: discounts, promo codes, homepage campaigns ───────────────
  promoCodes: adminQuery.query(() => listPromoCodes()),

  createPromoCode: adminQuery
    .input(z.object(promoCodeFields).required({ code: true, type: true, value: true }).superRefine(percentWithin100))
    .mutation(({ ctx, input }) => createPromoCode(input, ctx.user.id)),

  updatePromoCode: adminQuery
    .input(z.object({ id: idParam, data: z.object(promoCodeFields).partial() }))
    .mutation(async ({ input }) => {
      try {
        return await updatePromoCode(Number(input.id), input.data);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  deletePromoCode: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deletePromoCode(Number(input.id))),

  discounts: adminQuery.query(() => listDiscounts()),

  createDiscount: adminQuery
    .input(z.object(discountFields).required({ name_en: true, type: true, value: true }).superRefine(percentWithin100))
    .mutation(({ input }) => createDiscount(input)),

  updateDiscount: adminQuery
    .input(z.object({ id: idParam, data: z.object(discountFields).partial() }))
    .mutation(async ({ input }) => {
      try {
        return await updateDiscount(Number(input.id), input.data);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  deleteDiscount: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteDiscount(Number(input.id))),

  campaigns: adminQuery.query(() => listCampaigns()),

  createCampaign: adminQuery
    .input(z.object(campaignFields).required({ title_en: true }))
    .mutation(({ input }) => createCampaign(input)),

  updateCampaign: adminQuery
    .input(z.object({ id: idParam, data: z.object(campaignFields).partial() }))
    .mutation(({ input }) => updateCampaign(Number(input.id), input.data)),

  deleteCampaign: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteCampaign(Number(input.id))),

  // ── Admin tier: loyalty tier program ──────────────────────────────────────
  loyaltyAccounts: adminQuery
    .input(z.object({ search: z.string().max(320).optional() }).optional())
    .query(({ input }) => listLoyaltyAccounts(input?.search)),

  updateLoyaltyAccount: adminQuery
    .input(
      z.object({
        email: z.string().email(),
        patch: z
          .object({
            tier: z.enum(["new_kharboush", "kharboush_khebra", "kharboush_aslee"]),
            freeShippingCredits: z.number().int().min(0).max(999),
            tierLockedByAdmin: z.boolean(),
            lifetimeSpentCents: z.number().int().min(0),
            notes: z.string().max(2000).nullable(),
          })
          .partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const settings = await getSettings();
      return adminUpdateLoyaltyAccount(input.email, input.patch, settings.loyalty);
    }),

  // ── Super admin tier: staff roles + financials ────────────────────────────
  staff: superAdminQuery.query(() => listStaff()),

  upsertStaff: superAdminQuery
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(160).optional(),
        role: z.enum(["staff", "admin", "super_admin"]),
      }),
    )
    // superAdminQuery guarantees an authenticated session, and every session
    // user has an email (login is email-based), so the non-null assertion is safe.
    .mutation(({ ctx, input }) => upsertStaff(input, ctx.user.id, ctx.user.email!)),

  removeStaff: superAdminQuery
    .input(z.object({ email: z.string().email() }))
    // See upsertStaff: superAdminQuery guarantees a session user with an email.
    .mutation(({ ctx, input }) => removeStaff(input.email, ctx.user.id, ctx.user.email!)),

  unitCosts: superAdminQuery.query(() => getUnitCosts()),

  updateUnitCosts: superAdminQuery
    .input(
      z.object({
        blank_tee_cost: z.number().min(0).max(10_000),
        print_fee: z.number().min(0).max(10_000),
        packaging_cost: z.number().min(0).max(10_000),
      }),
    )
    .mutation(({ input }) => updateUnitCosts(input)),

  /** Per-garment-type factory blank costs (tee/hoodie/accessory, extensible). */
  garmentCosts: superAdminQuery.query(() => getGarmentCosts()),

  updateGarmentCost: superAdminQuery
    .input(
      z.object({
        // Slug-like free text (not the productType enum) so future garment
        // types can be costed without a schema migration.
        product_type: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/),
        cost: z.number().min(0).max(10_000),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await upsertGarmentCost(input.product_type, input.cost, input.label);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  overheadExpenses: superAdminQuery
    .input(z.object({ from: z.string().max(10).optional(), to: z.string().max(10).optional() }).optional())
    .query(({ input }) => listOverheadExpenses(input?.from, input?.to)),

  addOverheadExpense: superAdminQuery
    .input(
      z.object({
        category: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        amount: z.number().min(0).max(1_000_000),
        expense_date: z.string().min(1).max(10),
      }),
    )
    .mutation(({ ctx, input }) => addOverheadExpense(input, ctx.user.id)),

  deleteOverheadExpense: superAdminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteOverheadExpense(Number(input.id))),

  financialSummary: superAdminQuery
    .input(z.object({ from: z.string().max(10).optional(), to: z.string().max(10).optional() }).optional())
    .query(({ input }) => getFinancialSummary(input?.from, input?.to)),

  /** COD cash still owed to us, grouped by courier company. */
  codOutstandingByCourier: superAdminQuery
    .input(z.object({ from: z.string().max(10).optional(), to: z.string().max(10).optional() }).optional())
    .query(({ input }) => codOutstandingByCourier(input?.from, input?.to)),

  profitShares: superAdminQuery.query(() => getProfitShares()),

  updateProfitShares: superAdminQuery
    .input(
      z.object({
        shares: z
          .array(z.object({ name: z.string().trim().min(1).max(60), percent: z.number().min(0).max(100) }))
          .min(1)
          .max(4),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateProfitShares(input.shares, ctx.user.id);
      } catch (err) {
        rethrowFriendly(err);
      }
    }),

  factoryPayments: superAdminQuery
    .input(z.object({ from: z.string().max(10).optional(), to: z.string().max(10).optional() }).optional())
    .query(({ input }) => listFactoryPayments(input?.from, input?.to)),

  addFactoryPayment: superAdminQuery
    .input(
      z.object({
        amount: z.number().min(0.01).max(1_000_000),
        payment_date: z.string().min(1).max(10),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) => addFactoryPayment(input, ctx.user.id)),

  deleteFactoryPayment: superAdminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deleteFactoryPayment(Number(input.id))),

  /** What we owe the factory: consumed blanks + fulfilled print fees − payments. */
  factoryPayable: superAdminQuery.query(() => getFactoryPayable()),

  productMargins: superAdminQuery.query(() => listProductMargins()),

  updateProductCost: superAdminQuery
    .input(z.object({ id: idParam, cost_price: z.number().min(0).max(1_000_000).nullable() }))
    .mutation(({ input }) => updateProductCost(Number(input.id), input.cost_price)),
});
