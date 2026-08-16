import { relations } from "drizzle-orm";
import { users, orders, customRequests } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  customRequests: many(customRequests),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const customRequestsRelations = relations(customRequests, ({ one }) => ({
  user: one(users, { fields: [customRequests.userId], references: [users.id] }),
}));
