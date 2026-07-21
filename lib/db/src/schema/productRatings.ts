import { pgTable, serial, integer, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { criteriaTable } from "./criteria";

export const productRatingsTable = pgTable(
  "product_ratings",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteriaTable.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 4, scale: 2 }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [unique("product_criterion_unique").on(t.productId, t.criterionId)],
);

export const insertProductRatingSchema = createInsertSchema(productRatingsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertProductRating = z.infer<typeof insertProductRatingSchema>;
export type ProductRating = typeof productRatingsTable.$inferSelect;
