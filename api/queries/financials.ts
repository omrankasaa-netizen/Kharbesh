import { and, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "./connection";
import { orders, overheadExpenses, products, unitCostSettings, type OrderLineItem } from "@db/schema";

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
 * Revenue = sum of order totals. COGS = unit cost total × total item qty
 * across all orders in range (flat unit cost across colors/product types —
 * v1 approximation). Overhead = sum of logged expenses in range.
 */
export async function getFinancialSummary(from?: string, to?: string) {
  const db = getDb();
  const unitCosts = await getUnitCosts();

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
  for (const o of orderRows) {
    revenueCents += o.totalCents;
    for (const item of o.items as OrderLineItem[]) {
      unitsCount += item.quantity;
    }
  }
  const cogsCents = Math.round(unitCosts.unit_cost_total * 100) * unitsCount;

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
