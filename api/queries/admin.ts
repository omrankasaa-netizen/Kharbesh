import { getDb } from "./connection";
import { auditLogs, products, users } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { toUiProduct } from "./catalog";

export async function listUsers() {
  const rows = await getDb().select().from(users);
  return rows.map((u) => ({
    id: String(u.id),
    full_name: u.name,
    email: u.email,
    role: u.role,
    created_date: u.createdAt.toISOString(),
  }));
}

/** Admin partial update for a product. Fields arrive in UI (snake_case) shape. */
export async function updateProduct(
  id: number,
  data: {
    status?: "active" | "draft" | "archived";
    preorder_capacity?: number | null;
    units_sold?: number;
    price?: number;
  },
  actorUserId: number,
) {
  const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (data.status) patch.status = data.status;
  if (data.preorder_capacity !== undefined) patch.preorderCapacity = data.preorder_capacity;
  if (data.units_sold !== undefined) patch.unitsSold = data.units_sold;
  if (data.price !== undefined) patch.priceCents = Math.round(data.price * 100);

  const db = getDb();
  await db.update(products).set(patch).where(eq(products.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "product.updated",
    entity: "product",
    entityId: String(id),
    detail: data,
  });
  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  return row ? toUiProduct(row) : null;
}

export async function listAuditLogs(limit = 100) {
  return getDb().select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}
