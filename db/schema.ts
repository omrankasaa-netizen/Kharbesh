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
    images: json("images").$type<string[]>().notNull(),
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
    ]).default("order_received").notNull(),
    internalStatus: varchar("internalStatus", { length: 60 }).default("payment_pending").notNull(),
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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StaffRole = typeof staffRoles.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type GarmentColor = typeof garmentColors.$inferSelect;
export type GarmentStyle = typeof garmentStyles.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type CustomRequest = typeof customRequests.$inferSelect;
export type BlankStock = typeof blankStock.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type FactoryOrder = typeof factoryOrders.$inferSelect;
export type FactoryOrderItem = typeof factoryOrderItems.$inferSelect;
export type UnitCostSettings = typeof unitCostSettings.$inferSelect;
export type OverheadExpense = typeof overheadExpenses.$inferSelect;
