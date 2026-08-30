import { and, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm";
import { getDb } from "./connection";
import {
  auditLogs,
  blankStock,
  factoryOrderItems,
  factoryOrders,
  factoryPayments,
  garmentCosts,
  orders,
  overheadExpenses,
  products,
  profitSplitSettings,
  stockMovements,
  unitCostSettings,
  type FactoryPayment,
  type GarmentCost,
  type OrderLineItem,
} from "@db/schema";

function toUiExpense(e: typeof overheadExpenses.$inferSelect) {
  return {
    id: String(e.id),
    category: e.category,
    description: e.description,
    amount: e.amountCents / 100,
    expense_date: e.expenseDate,
    created_date: e.createdAt.toISOString(),
  };
}

/** Single global row of per-unit production cost. Created lazily on first read. */
export async function getUnitCosts() {
  const db = getDb();
  const rows = await db.select().from(unitCostSettings).limit(1);
  if (rows[0]) {
    return {
      id: String(rows[0].id),
      blank_tee_cost: rows[0].blankTeeCostCents / 100,
      print_fee: rows[0].printFeeCents / 100,
      packaging_cost: rows[0].packagingCostCents / 100,
      unit_cost_total: (rows[0].blankTeeCostCents + rows[0].printFeeCents + rows[0].packagingCostCents) / 100,
      updated_date: rows[0].updatedAt.toISOString(),
    };
  }
  const [{ id }] = await db.insert(unitCostSettings).values({}).$returningId();
  return {
    id: String(id),
    blank_tee_cost: 0,
    print_fee: 0,
    packaging_cost: 0,
    unit_cost_total: 0,
    updated_date: new Date().toISOString(),
  };
}

export function toUiGarmentCost(r: GarmentCost) {
  return {
    id: String(r.id),
    product_type: r.productType,
    label: r.label,
    cost: r.costCents / 100,
    updated_date: r.updatedAt.toISOString(),
  };
}

/**
 * Per-garment-type factory blank costs, lazily seeded on first read:
 * tee inherits the existing global blank-tee setting when it's set (owner
 * confirmed the tee blank is $13, so 1300 cents otherwise); hoodie and
 * accessory start at 0 until the owner keys in their real factory prices.
 * New garment types can be added later via `upsertGarmentCost` — the table
 * is a varchar-keyed list, not an enum, so no migration is needed.
 */
export async function getGarmentCosts() {
  const db = getDb();
  let rows = await db.select().from(garmentCosts);
  if (rows.length === 0) {
    const [unitRow] = await db.select().from(unitCostSettings).limit(1);
    const teeCostCents = unitRow && unitRow.blankTeeCostCents > 0 ? unitRow.blankTeeCostCents : 1300;
    for (const seed of [
      { productType: "tee", label: "T-Shirt", costCents: teeCostCents },
      { productType: "hoodie", label: "Hoodie", costCents: 0 },
      { productType: "accessory", label: "Accessory", costCents: 0 },
    ]) {
      await db.insert(garmentCosts).values(seed);
    }
    rows = await db.select().from(garmentCosts);
  }
  return rows
    .sort((a, b) => a.productType.localeCompare(b.productType))
    .map(toUiGarmentCost);
}

/** Upserts one garment-type blank cost (dollars in, cents stored). */
export async function upsertGarmentCost(productType: string, cost: number, label?: string) {
  const db = getDb();
  const costCents = Math.round(cost * 100);
  const existing = await db.query.garmentCosts.findFirst({ where: eq(garmentCosts.productType, productType) });
  if (existing) {
    await db
      .update(garmentCosts)
      .set({ costCents, ...(label !== undefined ? { label } : {}), updatedAt: new Date() })
      .where(eq(garmentCosts.id, existing.id));
  } else {
    await db.insert(garmentCosts).values({ productType, label: label ?? null, costCents });
  }
  return getGarmentCosts();
}

/** Blank cost in cents per garment type for COGS. Types with no row in
 *  garment_costs (future/unknown types) fall back to the tee cost — most
 *  of what the factory prints is tees, so that's the safest estimate. */
async function getGarmentCostMapCents() {
  const db = getDb();
  const rows = await db.select().from(garmentCosts);
  const map = new Map(rows.map((r) => [r.productType, r.costCents]));
  // The tee row is the universal fallback; if the table hasn't been seeded
  // yet, mirror getGarmentCosts' default ($13) rather than costing at 0.
  const fallback = map.get("tee") ?? 1300;
  return { map, fallback };
}

export async function updateUnitCosts(data: { blank_tee_cost: number; print_fee: number; packaging_cost: number }) {
  const db = getDb();
  const rows = await db.select().from(unitCostSettings).limit(1);
  const patch = {
    blankTeeCostCents: Math.round(data.blank_tee_cost * 100),
    printFeeCents: Math.round(data.print_fee * 100),
    packagingCostCents: Math.round(data.packaging_cost * 100),
    updatedAt: new Date(),
  };
  if (rows[0]) {
    await db.update(unitCostSettings).set(patch).where(eq(unitCostSettings.id, rows[0].id));
  } else {
    await db.insert(unitCostSettings).values(patch);
  }
  return getUnitCosts();
}

export async function listOverheadExpenses(from?: string, to?: string) {
  const db = getDb();
  const conditions = [];
  if (from) conditions.push(gte(overheadExpenses.expenseDate, from));
  if (to) conditions.push(lte(overheadExpenses.expenseDate, to));
  const rows = conditions.length
    ? await db.select().from(overheadExpenses).where(and(...conditions))
    : await db.select().from(overheadExpenses);
  return rows.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)).map(toUiExpense);
}

export async function addOverheadExpense(
  data: { category: string; description?: string; amount: number; expense_date: string },
  actorUserId: number,
) {
  const db = getDb();
  const [{ id }] = await db
    .insert(overheadExpenses)
    .values({
      category: data.category,
      description: data.description ?? null,
      amountCents: Math.round(data.amount * 100),
      expenseDate: data.expense_date,
      createdByUserId: actorUserId,
    })
    .$returningId();
  const [row] = await db.select().from(overheadExpenses).where(eq(overheadExpenses.id, id)).limit(1);
  return toUiExpense(row);
}

export async function deleteOverheadExpense(id: number) {
  const db = getDb();
  await db.delete(overheadExpenses).where(eq(overheadExpenses.id, id));
  return { success: true };
}

/**
 * Computes revenue, COGS, overhead, and net profit for a date range.
 * Revenue = sum of order totals. COGS per order line item =
 * qty × (blank cost for that item's garment type + print fee + packaging).
 * The blank cost comes from garment_costs; an item whose product type has
 * no row there falls back to the tee cost (most items are tees — see
 * getGarmentCostMapCents). Overhead = sum of logged expenses in range.
 */
export async function getFinancialSummary(from?: string, to?: string) {
  const db = getDb();
  const unitCosts = await getUnitCosts();
  const { map: blankCostByType, fallback: fallbackBlankCost } = await getGarmentCostMapCents();
  const printFeeCents = Math.round(unitCosts.print_fee * 100);
  const packagingCostCents = Math.round(unitCosts.packaging_cost * 100);
  const costForType = (productType: string | undefined) =>
    (productType != null ? blankCostByType.get(productType) : undefined) ?? fallbackBlankCost;

  const conditions = [];
  if (from) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to) conditions.push(lte(orders.createdAt, new Date(to + "T23:59:59")));
  // Cancelled orders never became revenue — exclude them from the summary
  // (and from the units driving the COGS approximation).
  conditions.push(ne(orders.status, "cancelled"));
  const orderRows = conditions.length
    ? await db.select().from(orders).where(and(...conditions))
    : await db.select().from(orders);

  let revenueCents = 0;
  let unitsCount = 0;
  let cogsCents = 0;
  // COD cash tracking: 'delivered' ≠ 'cash received' — the courier holds the
  // cash until the weekly settlement, so collected vs outstanding is tracked
  // on the order itself (cashCollectedAt / handedToCourierAt).
  let codCollectedCents = 0;
  let codOutstandingCents = 0;
  let codOutstandingWithCourierCents = 0;
  let onlineRevenueCents = 0;
  for (const o of orderRows) {
    revenueCents += o.totalCents;
    if (o.paymentMethod === "cash_on_delivery") {
      if (o.cashCollectedAt) {
        codCollectedCents += o.totalCents;
      } else {
        codOutstandingCents += o.totalCents;
        if (o.handedToCourierAt) codOutstandingWithCourierCents += o.totalCents;
      }
    } else if (o.paymentMethod === "whish") {
      onlineRevenueCents += o.totalCents;
    }
    for (const item of o.items as OrderLineItem[]) {
      unitsCount += item.quantity;
      cogsCents += item.quantity * (costForType(item.productType) + printFeeCents + packagingCostCents);
    }
  }

  const expenses = await listOverheadExpenses(from, to);
  const overheadCents = Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100);

  const revenue = revenueCents / 100;
  const cogs = cogsCents / 100;
  const overhead = overheadCents / 100;
  const netProfit = revenue - cogs - overhead;

  return {
    from: from ?? null,
    to: to ?? null,
    order_count: orderRows.length,
    units_sold: unitsCount,
    revenue,
    cogs,
    overhead,
    net_profit: netProfit,
    margin_pct: revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0,
    cod_collected: codCollectedCents / 100,
    cod_outstanding: codOutstandingCents / 100,
    cod_outstanding_with_courier: codOutstandingWithCourierCents / 100,
    online_revenue: onlineRevenueCents / 100,
  };
}

/**
 * Outstanding COD cash grouped by courier company: handed-off, not-yet-
 * collected, non-cancelled orders. Drives the weekly settlement chase.
 */
export async function codOutstandingByCourier(from?: string, to?: string) {
  const db = getDb();
  const conditions = [
    ne(orders.status, "cancelled"),
    eq(orders.paymentMethod, "cash_on_delivery"),
    isNull(orders.cashCollectedAt),
    isNotNull(orders.handedToCourierAt),
  ];
  if (from) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to) conditions.push(lte(orders.createdAt, new Date(to + "T23:59:59")));
  const rows = await db
    .select({ courierName: orders.courierName, totalCents: orders.totalCents })
    .from(orders)
    .where(and(...conditions));
  const byCourier = new Map<string, { order_count: number; total_cents: number }>();
  for (const r of rows) {
    const name = r.courierName ?? "(unknown)";
    const entry = byCourier.get(name) ?? { order_count: 0, total_cents: 0 };
    entry.order_count += 1;
    entry.total_cents += r.totalCents;
    byCourier.set(name, entry);
  }
  return [...byCourier.entries()]
    .map(([courier_name, e]) => ({ courier_name, order_count: e.order_count, total: e.total_cents / 100 }))
    .sort((a, b) => b.total - a.total);
}

// ── Partner profit split (super_admin) ───────────────────────────────────────

export type ProfitShare = { name: string; percent: number };

/**
 * Validates the partner split. Returns null when valid, otherwise a friendly
 * error code the router maps to a message that survives tRPC masking. Kept
 * pure (no DB) so it's unit-testable; zod in the router guards shape too.
 */
export function validateProfitShares(shares: ProfitShare[]): string | null {
  if (!Array.isArray(shares) || shares.length < 1 || shares.length > 4) return "INVALID_SHARES";
  for (const s of shares) {
    if (!s || typeof s.name !== "string" || s.name.trim().length < 1 || s.name.length > 60) return "INVALID_SHARES";
    if (typeof s.percent !== "number" || !Number.isFinite(s.percent) || s.percent < 0 || s.percent > 100) {
      return "INVALID_SHARES";
    }
  }
  const total = shares.reduce((sum, s) => sum + s.percent, 0);
  // Tolerate float dust from decimal percents (e.g. 33.3 + 33.3 + 33.4).
  if (Math.abs(total - 100) > 1e-6) return "SHARES_MUST_TOTAL_100";
  return null;
}

/** Single-row profit-split settings, lazily created empty on first read. */
export async function getProfitShares() {
  const db = getDb();
  const [row] = await db.select().from(profitSplitSettings).limit(1);
  if (row) {
    return { id: String(row.id), shares: row.shares, updated_date: row.updatedAt.toISOString() };
  }
  const [{ id }] = await db.insert(profitSplitSettings).values({ shares: [] }).$returningId();
  return { id: String(id), shares: [] as ProfitShare[], updated_date: new Date().toISOString() };
}

export async function updateProfitShares(shares: ProfitShare[], actorUserId: number) {
  const invalid = validateProfitShares(shares);
  if (invalid) throw new Error(invalid);
  const db = getDb();
  const cleaned = shares.map((s) => ({ name: s.name.trim(), percent: s.percent }));
  const [row] = await db.select().from(profitSplitSettings).limit(1);
  if (row) {
    await db
      .update(profitSplitSettings)
      .set({ shares: cleaned, updatedAt: new Date() })
      .where(eq(profitSplitSettings.id, row.id));
  } else {
    await db.insert(profitSplitSettings).values({ shares: cleaned });
  }
  await db.insert(auditLogs).values({
    actorUserId,
    action: "profit_shares.updated",
    entity: "profit_split_settings",
    entityId: null,
    detail: { shares: cleaned },
  });
  return getProfitShares();
}

// ── Factory payable ledger (super_admin) ─────────────────────────────────────

function toUiFactoryPayment(p: FactoryPayment) {
  return {
    id: String(p.id),
    amount: p.amountCents / 100,
    payment_date: p.paymentDate,
    note: p.note,
    created_date: p.createdAt.toISOString(),
  };
}

export async function listFactoryPayments(from?: string, to?: string) {
  const db = getDb();
  const conditions = [];
  if (from) conditions.push(gte(factoryPayments.paymentDate, from));
  if (to) conditions.push(lte(factoryPayments.paymentDate, to));
  const rows = conditions.length
    ? await db.select().from(factoryPayments).where(and(...conditions))
    : await db.select().from(factoryPayments);
  return rows.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map(toUiFactoryPayment);
}

export async function addFactoryPayment(
  data: { amount: number; payment_date: string; note?: string },
  actorUserId: number,
) {
  const db = getDb();
  const [{ id }] = await db
    .insert(factoryPayments)
    .values({
      amountCents: Math.round(data.amount * 100),
      paymentDate: data.payment_date,
      note: data.note ?? null,
      createdByUserId: actorUserId,
    })
    .$returningId();
  const [row] = await db.select().from(factoryPayments).where(eq(factoryPayments.id, id)).limit(1);
  return toUiFactoryPayment(row);
}

export async function deleteFactoryPayment(id: number) {
  const db = getDb();
  await db.delete(factoryPayments).where(eq(factoryPayments.id, id));
  return { success: true };
}

/**
 * What we owe the factory right now, minus what we've already paid:
 *  - blanks value: every 'consumed' stock movement (blanks the factory
 *    turned into printed pieces) × the CURRENT garment_costs price for that
 *    garment type (tee-cost fallback for unknown types, same as COGS). This
 *    is a current-price estimate — historical cost isn't snapshotted on the
 *    movement row.
 *  - print fees: items of print_job factory orders that reached 'fulfilled'
 *    (the factory-done state — drafts/sent jobs haven't been worked yet,
 *    cancelled ones never will be) × the current print fee.
 *  - minus the sum of logged factory_payments.
 * All returned in dollars.
 */
export async function getFactoryPayable() {
  const db = getDb();
  const { map: blankCostByType, fallback: fallbackBlankCost } = await getGarmentCostMapCents();
  const unitCosts = await getUnitCosts();
  const printFeeCents = Math.round(unitCosts.print_fee * 100);

  const consumedRows = await db
    .select({ productType: blankStock.productType, quantityDelta: stockMovements.quantityDelta })
    .from(stockMovements)
    .innerJoin(blankStock, eq(stockMovements.stockId, blankStock.id))
    .where(eq(stockMovements.type, "consumed"));

  let blanksCents = 0;
  for (const r of consumedRows) {
    // Consumed deltas are negative (stock leaves the shelf).
    const qty = Math.max(0, -r.quantityDelta);
    blanksCents += qty * (blankCostByType.get(r.productType) ?? fallbackBlankCost);
  }

  const printRows = await db
    .select({ quantity: factoryOrderItems.quantity })
    .from(factoryOrderItems)
    .innerJoin(factoryOrders, eq(factoryOrderItems.factoryOrderId, factoryOrders.id))
    .where(and(eq(factoryOrders.type, "print_job"), eq(factoryOrders.status, "fulfilled")));
  const printFeesCents = printRows.reduce((sum, r) => sum + r.quantity, 0) * printFeeCents;

  const paymentRows = await db.select({ amountCents: factoryPayments.amountCents }).from(factoryPayments);
  const paymentsCents = paymentRows.reduce((sum, r) => sum + r.amountCents, 0);

  return {
    blanks_value: blanksCents / 100,
    print_fees_value: printFeesCents / 100,
    payments_total: paymentsCents / 100,
    payable: (blanksCents + printFeesCents - paymentsCents) / 100,
  };
}

/**
 * Per-product cost vs. profit view, super_admin only. Uses each product's
 * explicit `costPriceCents` when set; otherwise falls back to the flat
 * global unit-cost total (same approximation `getFinancialSummary` uses)
 * so every product still shows a usable margin before costs are itemized.
 */
export async function listProductMargins() {
  const db = getDb();
  const unitCosts = await getUnitCosts();
  const flatCostCents = Math.round(unitCosts.unit_cost_total * 100);

  const rows = await db.select().from(products).where(ne(products.status, "archived"));

  return rows
    .map((p) => {
      const costCents = p.costPriceCents ?? flatCostCents;
      const marginCents = p.priceCents - costCents;
      const totalProfitCents = marginCents * p.unitsSold;
      return {
        id: String(p.id),
        name: p.nameEn,
        status: p.status,
        price: p.priceCents / 100,
        cost: costCents / 100,
        cost_is_estimated: p.costPriceCents == null,
        margin: marginCents / 100,
        margin_pct: p.priceCents > 0 ? Math.round((marginCents / p.priceCents) * 1000) / 10 : 0,
        units_sold: p.unitsSold,
        total_profit: totalProfitCents / 100,
      };
    })
    .sort((a, b) => b.total_profit - a.total_profit);
}

/** Sets (or clears, when `costPrice` is null) a product's explicit landed unit cost. Super_admin only. */
export async function updateProductCost(id: number, costPrice: number | null) {
  const db = getDb();
  await db
    .update(products)
    .set({ costPriceCents: costPrice == null ? null : Math.round(costPrice * 100) })
    .where(eq(products.id, id));
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) throw new Error("NOT_FOUND");
  const flatCostCents = Math.round((await getUnitCosts()).unit_cost_total * 100);
  const costCents = row.costPriceCents ?? flatCostCents;
  const marginCents = row.priceCents - costCents;
  return {
    id: String(row.id),
    name: row.nameEn,
    price: row.priceCents / 100,
    cost: costCents / 100,
    cost_is_estimated: row.costPriceCents == null,
    margin: marginCents / 100,
    margin_pct: row.priceCents > 0 ? Math.round((marginCents / row.priceCents) * 1000) / 10 : 0,
  };
}
