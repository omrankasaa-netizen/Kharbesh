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
  listAuditLogs,
} from "./queries/admin";
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
import { listAllOrders, updateOrderStatus, hardDeleteOrder, sendOrderFollowupEmail } from "./queries/orders";
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
  listOverheadExpenses,
  addOverheadExpense,
  deleteOverheadExpense,
  getFinancialSummary,
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

  orders: staffQuery.query(() => listAllOrders()),

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
    .mutation(({ ctx, input }) =>
      generatePrintJobFromOrders(input.orderIds.map(Number), ctx.user.id),
    ),

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
    .input(z.object(promoCodeFields).required({ code: true, type: true, value: true }))
    .mutation(({ ctx, input }) => createPromoCode(input, ctx.user.id)),

  updatePromoCode: adminQuery
    .input(z.object({ id: idParam, data: z.object(promoCodeFields).partial() }))
    .mutation(({ input }) => updatePromoCode(Number(input.id), input.data)),

  deletePromoCode: adminQuery
    .input(z.object({ id: idParam }))
    .mutation(({ input }) => deletePromoCode(Number(input.id))),

  discounts: adminQuery.query(() => listDiscounts()),

  createDiscount: adminQuery
    .input(z.object(discountFields).required({ name_en: true, type: true, value: true }))
    .mutation(({ input }) => createDiscount(input)),

  updateDiscount: adminQuery
    .input(z.object({ id: idParam, data: z.object(discountFields).partial() }))
    .mutation(({ input }) => updateDiscount(Number(input.id), input.data)),

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
    .mutation(({ ctx, input }) => upsertStaff(input, ctx.user.id, ctx.user.email)),

  removeStaff: superAdminQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(({ ctx, input }) => removeStaff(input.email, ctx.user.id, ctx.user.email)),

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

  productMargins: superAdminQuery.query(() => listProductMargins()),

  updateProductCost: superAdminQuery
    .input(z.object({ id: idParam, cost_price: z.number().min(0).max(1_000_000).nullable() }))
    .mutation(({ input }) => updateProductCost(Number(input.id), input.cost_price)),
});
