import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Role hierarchy: user(0) < staff(1) < admin(2) < super_admin(3). Every tier
// inherits everything below it.
const ROLE_LEVEL: Record<string, number> = {
  user: 0,
  staff: 1,
  admin: 2,
  super_admin: 3,
};

function requireMinRole(minLevel: number) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const level = ROLE_LEVEL[ctx.user?.role ?? "user"] ?? 0;

    if (!ctx.user || level < minLevel) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
/** Staff and above: products, orders, custom requests, inventory, factory jobs. */
export const staffQuery = authedQuery.use(requireMinRole(1));
/** Admin and above: site settings, full catalog, CRM, analytics. */
export const adminQuery = authedQuery.use(requireMinRole(2));
/** Super admin only: financials, overhead, unit costs, staff management. */
export const superAdminQuery = authedQuery.use(requireMinRole(3));
