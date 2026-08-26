import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";
import { ensureLoyaltyAccountForEmail } from "./loyalty";
import { getSettings } from "./settings";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

/**
 * Resolves the admin-panel role for an email: the Staff Management table
 * (super_admin-managed) wins; falls back to the OWNER_UNION_ID /
 * ADMIN_ALLOWED_EMAILS bootstrap list (env-based) so nobody gets locked out
 * if the staff_roles table is ever empty (e.g. right after this migration).
 */
export async function resolveStaffRole(
  email: string | null | undefined,
  unionId: string,
): Promise<"staff" | "admin" | "super_admin" | undefined> {
  const normalized = email?.trim().toLowerCase();
  if (normalized) {
    const rows = await getDb()
      .select()
      .from(schema.staffRoles)
      .where(eq(schema.staffRoles.email, normalized))
      .limit(1);
    if (rows[0]) return rows[0].role;
  }

  const isBootstrapEmail = !!normalized && env.adminAllowedEmails.includes(normalized);
  if (unionId === env.ownerUnionId || isBootstrapEmail) return "super_admin";

  return undefined;
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (values.role === undefined && values.unionId) {
    const resolvedRole = await resolveStaffRole(values.email, values.unionId);
    if (resolvedRole) {
      values.role = resolvedRole;
      updateSet.role = resolvedRole;
    }
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });

  // Secondary/redundant loyalty seed — covers Google + email-OTP sign-in
  // ("on registration"). Kimi-only logins don't pass an email so they're
  // skipped here; the primary seed path for everyone else (including
  // guest checkout) is `applyLoyaltyToOrder`'s own create-if-missing
  // logic, which fires regardless of this hook.
  if (values.email) {
    const settings = await getSettings();
    await ensureLoyaltyAccountForEmail(values.email, settings.loyalty);
  }
}
