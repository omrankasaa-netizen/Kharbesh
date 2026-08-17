import { getDb } from "./connection";
import { auditLogs, customRequests, type CustomRequest } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";

export function toUiCustomRequest(r: CustomRequest) {
  return {
    id: String(r.id),
    name: r.name,
    email: r.email,
    phone: r.phone,
    phrase: r.phrase,
    story: r.story,
    language: r.language,
    recipient: r.recipient,
    occasion: r.occasion,
    tone: r.tone,
    garment: r.garment,
    color: r.color,
    size: r.size,
    quantity: r.quantity,
    placement: r.placement,
    needed_by: r.neededBy,
    notes: r.notes,
    reference_files: r.referenceFiles ?? [],
    rights_confirmed: r.rightsConfirmed,
    status: r.status,
    created_by_id: r.userId != null ? String(r.userId) : null,
    created_date: r.createdAt.toISOString(),
  };
}

export type CreateCustomRequestInput = {
  name: string;
  email: string;
  phone?: string;
  phrase: string;
  story?: string;
  language?: string;
  recipient?: string;
  occasion?: string;
  tone?: "subtle" | "bold" | "sarcastic" | "clean" | "colorful";
  garment?: string;
  color?: string;
  size?: string;
  quantity: number;
  placement?: string;
  neededBy?: string;
  notes?: string;
  referenceFiles: string[];
  rightsConfirmed: boolean;
  userId?: number;
};

export async function createCustomRequest(input: CreateCustomRequestInput) {
  const db = getDb();
  const [{ id }] = await db
    .insert(customRequests)
    .values({
      userId: input.userId ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      phrase: input.phrase,
      story: input.story ?? null,
      language: input.language ?? null,
      recipient: input.recipient ?? null,
      occasion: input.occasion ?? null,
      tone: input.tone ?? "subtle",
      garment: input.garment ?? null,
      color: input.color ?? null,
      size: input.size ?? null,
      quantity: input.quantity,
      placement: input.placement ?? null,
      neededBy: input.neededBy ?? null,
      notes: input.notes ?? null,
      referenceFiles: input.referenceFiles,
      rightsConfirmed: input.rightsConfirmed,
      status: "new_request",
    })
    .$returningId();

  await db.insert(auditLogs).values({
    actorUserId: input.userId ?? null,
    action: "custom_request.created",
    entity: "custom_request",
    entityId: String(id),
    detail: { phrase: input.phrase.slice(0, 80), quantity: input.quantity },
  });

  const row = await db.query.customRequests.findFirst({ where: eq(customRequests.id, id) });
  return row ? toUiCustomRequest(row) : null;
}

export async function listCustomRequestsForUser(email: string) {
  const rows = await getDb()
    .select()
    .from(customRequests)
    .where(eq(sql`lower(${customRequests.email})`, email.toLowerCase()))
    .orderBy(desc(customRequests.createdAt));
  return rows.map(toUiCustomRequest);
}

export async function listAllCustomRequests(limit = 200) {
  const rows = await getDb()
    .select()
    .from(customRequests)
    .orderBy(desc(customRequests.createdAt))
    .limit(limit);
  return rows.map(toUiCustomRequest);
}

export async function updateCustomRequestStatus(
  id: number,
  status: (typeof customRequests.status.enumValues)[number],
  actorUserId: number,
) {
  const db = getDb();
  await db
    .update(customRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(customRequests.id, id));
  await db.insert(auditLogs).values({
    actorUserId,
    action: "custom_request.status_updated",
    entity: "custom_request",
    entityId: String(id),
    detail: { status },
  });
  const row = await db.query.customRequests.findFirst({ where: eq(customRequests.id, id) });
  return row ? toUiCustomRequest(row) : null;
}
