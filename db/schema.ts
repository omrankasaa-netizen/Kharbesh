import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  bigint,
  boolean,
  timestamp,
  mysqlEnum,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ── Auth (managed by the platform OAuth flow) ────────────────────────────────
// Role hierarchy (lowest → highest): user < staff < admin < super_admin.
// - user: customer (Kimi login), no admin panel access.
// - staff: day-to-day ops — products, orders, custom requests, inventory,
//   factory jobs. No financials, no site settings, no staff management.
// - admin: everything staff can do, plus non-sensitive site management
//   (site settings, full catalog incl. archive, CRM, analytics).
// - super_admin: everything, plus financials/overhead/profit and staff
//   role management. Bootstrapped from OWNER_UNION_ID / ADMIN_ALLOWED_EMAILS.
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "staff", "admin", "super_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

// Email sign-in codes ("OTP"): a customer types their email, we mail a
// 6-digit code, they type it back in to sign in. `codeHash` stores a salted
// hash, never the plaintext code. One row per code sent; old rows are just
// left to expire (no cleanup job needed at this volume).
export const emailOtps = mysqlTable(
  "email_otps",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    consumedAt: timestamp("consumedAt"),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index("email_otps_email_idx").on(t.email),
  }),
);

// Staff directory: who can access the admin panel and at what role. Managed
// entirely from the Staff Management screen (super_admin only). Rows here
// are synced into `users.role` the next time that email signs in.
export const staffRoles = mysqlTable("staff_roles", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 160 }),
  role: mysqlEnum("role", ["staff", "admin", "super_admin"]).notNull(),
  addedByUserId: bigint("addedByUserId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ── Catalog ──────────────────────────────────────────────────────────────────
export const collections = mysqlTable("collections", {
  id: serial("id").primaryKey(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  nameAr: varchar("nameAr", { length: 160 }),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  accent: varchar("accent", { length: 20 }),
  coverImage: text("coverImage"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const garmentColors = mysqlTable("garment_colors", {
  id: serial("id").primaryKey(),
  nameEn: varchar("nameEn", { length: 80 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 80 }),
  hex: varchar("hex", { length: 9 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const garmentStyles = mysqlTable("garment_styles", {
  id: serial("id").primaryKey(),
  nameEn: varchar("nameEn", { length: 120 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 120 }),
  priceModifierCents: int("priceModifierCents").default(0).notNull(),
  sizes: json("sizes").$type<string[]>().notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    nameEn: varchar("nameEn", { length: 180 }).notNull(),
    nameAr: varchar("nameAr", { length: 180 }),
    phraseAr: varchar("phraseAr", { length: 255 }),
    phraseEn: varchar("phraseEn", { length: 255 }),
    payoffEn: varchar("payoffEn", { length: 255 }),
    descriptionEn: text("descriptionEn"),
    descriptionAr: text("descriptionAr"),
    collectionName: varchar("collectionName", { length: 160 }),
    mood: varchar("mood", { length: 120 }),
    productType: mysqlEnum("productType", ["tee", "hoodie", "accessory"]).notNull(),
    garmentStyle: varchar("garmentStyle", { length: 120 }),
    fitEn: varchar("fitEn", { length: 180 }),
    careEn: text("careEn"),
    careAr: text("careAr"),
    measurementsEn: text("measurementsEn"),
    approvedColors: json("approvedColors").$type<string[]>().notNull(),
    sizes: json("sizes").$type<string[]>().notNull(),
    placement: varchar("placement", { length: 180 }),
    priceCents: int("priceCents").notNull(),
    compareAtPriceCents: int("compareAtPriceCents"),
    // Landed cost per unit (blank + print + packaging, or a manual override).
    // Never exposed to customers or plain staff — super_admin only, used to
    // compute per-product profit margin alongside the unit cost settings.
    costPriceCents: int("costPriceCents"),
    images: json("images").$type<string[]>().notNull(),
    // Flat print-ready artwork the factory prints from, distinct from
    // marketing photos in `images` — resolved onto each factory order item
    // at handoff time so the factory always gets the exact file to print.
    printFileUrl: varchar("printFileUrl", { length: 500 }),
    status: mysqlEnum("status", ["active", "draft", "archived"]).default("draft").notNull(),
    preorderType: mysqlEnum("preorderType", [
      "open_until",
      "quantity_target",
      "limited_quantity",
      "always_on",
    ]).default("always_on").notNull(),
    preorderCloseDate: varchar("preorderCloseDate", { length: 10 }),
    preorderCapacity: int("preorderCapacity"),
    unitsSold: int("unitsSold").default(0).notNull(),
    estimatedProductionDays: int("estimatedProductionDays").default(10).notNull(),
    estimatedDispatchWindow: varchar("estimatedDispatchWindow", { length: 120 }),
    dropName: varchar("dropName", { length: 160 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("products_status_idx").on(t.status),
    collectionIdx: index("products_collection_idx").on(t.collectionName),
  }),
);

// Real product photos per garment color (front/back/etc), so the storefront
// can show the actual printed design on the color the shopper picked instead
// of the generic mockup. One row per product+color; `images[0]` is treated
// as the primary/front shot.
export const productColorImages = mysqlTable(
  "product_color_images",
  {
    id: serial("id").primaryKey(),
    productId: bigint("productId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorName: varchar("colorName", { length: 80 }).notNull(),
    images: json("images").$type<string[]>().notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    variantIdx: uniqueIndex("product_color_images_variant_idx").on(t.productId, t.colorName),
    productIdx: index("product_color_images_product_idx").on(t.productId),
  }),
);

// ── Orders ───────────────────────────────────────────────────────────────────
export type OrderLineItem = {
  productId: string;
  productName: string;
  phrase?: string;
  productType?: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
    userId: bigint("userId", { mode: "number", unsigned: true }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    shippingAddress: varchar("shippingAddress", { length: 255 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    country: varchar("country", { length: 120 }).notNull(),
    notes: text("notes"),
    items: json("items").$type<OrderLineItem[]>().notNull(),
    subtotalCents: int("subtotalCents").notNull(),
    shippingCents: int("shippingCents").default(0).notNull(),
    discountCents: int("discountCents").default(0).notNull(),
    promoCode: varchar("promoCode", { length: 40 }),
    appliedDiscounts: json("appliedDiscounts").$type<{ name: string; amountCents: number }[]>(),
    // Loyalty snapshot at the moment this order was placed — kept even if
    // the account's tier later changes, so order history/admin/emails stay
    // accurate to what actually happened on this order.
    loyaltyTierAtOrder: mysqlEnum("loyaltyTierAtOrder", ["new_kharboush", "kharboush_khebra", "kharboush_aslee"]),
    loyaltyDiscountCents: int("loyaltyDiscountCents").default(0).notNull(),
    freeShippingFromLoyalty: boolean("freeShippingFromLoyalty").default(false).notNull(),
    totalCents: int("totalCents").notNull(),
    status: mysqlEnum("status", [
      "order_received",
      "preorder_confirmed",
      "in_production",
      "being_printed",
      "preparing_shipment",
      "on_the_way",
      "delivered",
      "needs_attention",
      "cancelled",
    ]).default("order_received").notNull(),
    internalStatus: varchar("internalStatus", { length: 60 }).default("payment_pending").notNull(),
    paymentMethod: mysqlEnum("paymentMethod", ["cash_on_delivery", "whish"]).default("cash_on_delivery").notNull(),
    // Courier handoff + COD cash collection: staff hand orders to a courier
    // company, which collects cash from the customer and settles with us
    // later — so 'delivered' must NOT be conflated with 'cash received'.
    courierName: varchar("courierName", { length: 120 }),
    handedToCourierAt: timestamp("handedToCourierAt"),
    cashCollectedAt: timestamp("cashCollectedAt"),
    language: mysqlEnum("language", ["en", "ar"]).default("en").notNull(),
    isGuest: boolean("isGuest").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index("orders_email_idx").on(t.email),
    statusIdx: index("orders_status_idx").on(t.status),
  }),
);

// ── Custom print requests (3a Zaw2ak) ────────────────────────────────────────
export const customRequests = mysqlTable("custom_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  phrase: varchar("phrase", { length: 500 }).notNull(),
  story: text("story"),
  language: varchar("language", { length: 60 }),
  recipient: varchar("recipient", { length: 120 }),
  occasion: varchar("occasion", { length: 200 }),
  tone: mysqlEnum("tone", ["subtle", "bold", "sarcastic", "clean", "colorful"]).default("subtle"),
  garment: varchar("garment", { length: 120 }),
  color: varchar("color", { length: 80 }),
  size: varchar("size", { length: 20 }),
  quantity: int("quantity").default(1).notNull(),
  placement: varchar("placement", { length: 120 }),
  neededBy: varchar("neededBy", { length: 40 }),
  notes: text("notes"),
  referenceFiles: json("referenceFiles").$type<string[]>(),
  rightsConfirmed: boolean("rightsConfirmed").default(false).notNull(),
  status: mysqlEnum("status", [
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
  ]).default("new_request").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ── Contact messages (public Contact page + WhatsApp follow-up) ─────────────
export const contactMessages = mysqlTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "archived"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ── Newsletter ───────────────────────────────────────────────────────────────
// Footer email capture for the launch community list. Email is unique so
// repeat signups are idempotent; `language` stores the UI locale at signup.
export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  language: varchar("language", { length: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Site settings + audit ────────────────────────────────────────────────────
export const siteSettings = mysqlTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: json("value"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 60 }).notNull(),
  entityId: varchar("entityId", { length: 60 }),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Blank garment inventory ───────────────────────────────────────────────────
// The factory holds physical blank garments (no print yet) per productType +
// color + size. Printed designs are applied on demand when an order arrives,
// so stock is tracked at the blank level, shared across every product/design
// that uses that garment/color/size combination.
export const blankStock = mysqlTable(
  "blank_stock",
  {
    id: serial("id").primaryKey(),
    productType: mysqlEnum("productType", ["tee", "hoodie", "accessory"]).notNull(),
    color: varchar("color", { length: 80 }).notNull(),
    size: varchar("size", { length: 20 }).notNull(),
    quantityOnHand: int("quantityOnHand").default(0).notNull(),
    lowStockThreshold: int("lowStockThreshold").default(2).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    variantIdx: uniqueIndex("blank_stock_variant_idx").on(t.productType, t.color, t.size),
  }),
);

export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    stockId: bigint("stockId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => blankStock.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["restock", "consumed", "adjustment"]).notNull(),
    quantityDelta: int("quantityDelta").notNull(),
    note: varchar("note", { length: 500 }),
    actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    stockIdx: index("stock_movements_stock_idx").on(t.stockId),
  }),
);

// ── Factory jobs (print runs + blank restock requests) ───────────────────────
// A factory order is a batch sent to the factory: either a print job (design
// + color + size to print for specific customer orders) or a restock request
// (more blanks to keep on hand). Each is exportable to Excel for the factory.
export const factoryOrders = mysqlTable("factory_orders", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["print_job", "restock"]).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "fulfilled", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdByUserId: bigint("createdByUserId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
  fulfilledAt: timestamp("fulfilledAt"),
});

export const factoryOrderItems = mysqlTable(
  "factory_order_items",
  {
    id: serial("id").primaryKey(),
    factoryOrderId: bigint("factoryOrderId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => factoryOrders.id, { onDelete: "cascade" }),
    sourceOrderId: bigint("sourceOrderId", { mode: "number", unsigned: true }),
    sourceOrderNumber: varchar("sourceOrderNumber", { length: 32 }),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    designNameEn: varchar("designNameEn", { length: 180 }),
    phraseEn: varchar("phraseEn", { length: 255 }),
    productType: mysqlEnum("productType", ["tee", "hoodie", "accessory"]).notNull(),
    color: varchar("color", { length: 80 }).notNull(),
    size: varchar("size", { length: 20 }).notNull(),
    quantity: int("quantity").notNull(),
    placement: varchar("placement", { length: 180 }),
    notes: varchar("notes", { length: 500 }),
    // Denormalized at handoff time from the source order + product, so the
    // factory export always has the customer to ship to and the exact
    // print-ready file, even if the source order or product changes later.
    customerName: varchar("customerName", { length: 160 }),
    customerPhone: varchar("customerPhone", { length: 40 }),
    customerAddress: varchar("customerAddress", { length: 255 }),
    printFileUrl: varchar("printFileUrl", { length: 500 }),
  },
  (t) => ({
    orderIdx: index("factory_order_items_order_idx").on(t.factoryOrderId),
  }),
);

// ── Financials (super_admin only) ─────────────────────────────────────────────
// Single-row settings for per-unit production cost, used to compute COGS
// against every order line item.
export const unitCostSettings = mysqlTable("unit_cost_settings", {
  id: serial("id").primaryKey(),
  blankTeeCostCents: int("blankTeeCostCents").default(0).notNull(),
  printFeeCents: int("printFeeCents").default(0).notNull(),
  packagingCostCents: int("packagingCostCents").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Per-garment-type factory blank cost (what the owner pays per blank piece).
// Deliberately a varchar, NOT a mysqlEnum like products.productType — costs
// for future garment types must be addable from the admin UI without a
// schema migration; the COGS lookup falls back to the tee cost for any
// type with no row here.
export const garmentCosts = mysqlTable(
  "garment_costs",
  {
    id: serial("id").primaryKey(),
    productType: varchar("productType", { length: 40 }).notNull(),
    label: varchar("label", { length: 80 }),
    costCents: int("costCents").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: uniqueIndex("garment_costs_type_idx").on(t.productType),
  }),
);

export const overheadExpenses = mysqlTable(
  "overhead_expenses",
  {
    id: serial("id").primaryKey(),
    category: varchar("category", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    amountCents: int("amountCents").notNull(),
    expenseDate: varchar("expenseDate", { length: 10 }).notNull(),
    createdByUserId: bigint("createdByUserId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    dateIdx: index("overhead_expenses_date_idx").on(t.expenseDate),
  }),
);

// Single-row partner profit-split settings (super_admin). The empty default
// lives in the app layer (lazy create) because MySQL JSON column defaults are
// version-sensitive and drizzle can't emit one portably.
export const profitSplitSettings = mysqlTable("profit_split_settings", {
  id: serial("id").primaryKey(),
  shares: json("shares").$type<{ name: string; percent: number }[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Payments made TO the factory, logged by the super_admin. The factory
// payable ledger is computed as (consumed blanks + print fees) minus the sum
// of these payments.
export const factoryPayments = mysqlTable(
  "factory_payments",
  {
    id: serial("id").primaryKey(),
    amountCents: int("amountCents").notNull(),
    // YYYY-MM-DD like overhead_expenses.expenseDate — a plain business date,
    // not a moment in time.
    paymentDate: varchar("paymentDate", { length: 10 }).notNull(),
    note: varchar("note", { length: 500 }),
    createdByUserId: bigint("createdByUserId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    dateIdx: index("factory_payments_date_idx").on(t.paymentDate),
  }),
);

// ── Promotions: discounts, promo codes, homepage campaigns ───────────────────
// Code-based discounts a shopper types at checkout. Value is a percent
// (1-100) when type is "percent", or cents when type is "fixed".
export const promoCodes = mysqlTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: mysqlEnum("type", ["percent", "fixed"]).notNull(),
  value: int("value").notNull(),
  minOrderCents: int("minOrderCents"),
  maxUses: int("maxUses"),
  usesCount: int("usesCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  createdByUserId: bigint("createdByUserId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Automatic discounts: no code needed, applied at checkout to matching
// items (or the whole order) while active and within its date window.
export const discounts = mysqlTable("discounts", {
  id: serial("id").primaryKey(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  nameAr: varchar("nameAr", { length: 160 }),
  type: mysqlEnum("type", ["percent", "fixed"]).notNull(),
  value: int("value").notNull(),
  appliesTo: mysqlEnum("appliesTo", ["all", "product_type", "collection"]).default("all").notNull(),
  appliesValue: varchar("appliesValue", { length: 160 }),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Scheduled homepage promo banners, optionally tied to a promo code or an
// automatic discount so the banner and the actual checkout math stay linked.
export const campaigns = mysqlTable("campaigns", {
  id: serial("id").primaryKey(),
  titleEn: varchar("titleEn", { length: 200 }).notNull(),
  titleAr: varchar("titleAr", { length: 200 }),
  subtitleEn: varchar("subtitleEn", { length: 300 }),
  subtitleAr: varchar("subtitleAr", { length: 300 }),
  ctaLabelEn: varchar("ctaLabelEn", { length: 80 }),
  ctaLabelAr: varchar("ctaLabelAr", { length: 80 }),
  linkUrl: varchar("linkUrl", { length: 255 }),
  promoCodeId: bigint("promoCodeId", { mode: "number", unsigned: true }).references(
    () => promoCodes.id,
    { onDelete: "set null" },
  ),
  discountId: bigint("discountId", { mode: "number", unsigned: true }).references(
    () => discounts.id,
    { onDelete: "set null" },
  ),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ── Loyalty tiers (New Kharboush / Kharboush Khebra / Kharboush Aslee) ──────
// Email-keyed (lowercased, unique) rather than tied to `users.id` — a
// customer earns and keeps tier progress whether they check out as a guest
// or a signed-in account, and the two paths converge on the same row the
// moment they use the same email. `freeShippingCredits` is a consumable
// counter (New/Khebra); Aslee ignores it and is always free (permanent),
// enforced in application code via the tier itself rather than a magic
// credit value. `tierLockedByAdmin` freezes auto-recalculation so a manual
// override (grant/revoke by support) survives the next order.
export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  tier: mysqlEnum("tier", ["new_kharboush", "kharboush_khebra", "kharboush_aslee"])
    .default("new_kharboush")
    .notNull(),
  lifetimeSpentCents: int("lifetimeSpentCents").default(0).notNull(),
  freeShippingCredits: int("freeShippingCredits").default(1).notNull(),
  tierLockedByAdmin: boolean("tierLockedByAdmin").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StaffRole = typeof staffRoles.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type GarmentColor = typeof garmentColors.$inferSelect;
export type GarmentStyle = typeof garmentStyles.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type CustomRequest = typeof customRequests.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type BlankStock = typeof blankStock.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type FactoryOrder = typeof factoryOrders.$inferSelect;
export type FactoryOrderItem = typeof factoryOrderItems.$inferSelect;
export type UnitCostSettings = typeof unitCostSettings.$inferSelect;
export type GarmentCost = typeof garmentCosts.$inferSelect;
export type OverheadExpense = typeof overheadExpenses.$inferSelect;
export type ProfitSplitSettings = typeof profitSplitSettings.$inferSelect;
export type FactoryPayment = typeof factoryPayments.$inferSelect;
export type ProductColorImages = typeof productColorImages.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type LoyaltyTier = LoyaltyAccount["tier"];
