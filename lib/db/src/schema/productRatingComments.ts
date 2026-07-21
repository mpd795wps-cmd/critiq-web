import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { criteriaTable } from "./criteria";

export const productRatingCommentsTable = pgTable("product_rating_comments", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  criterionId: integer("criterion_id")
    .notNull()
    .references(() => criteriaTable.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductRatingComment = typeof productRatingCommentsTable.$inferSelect;
