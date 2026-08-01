import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories.js";

export const productStatusEnum = ["active", "pending", "rejected"] as const;
export type ProductStatus = (typeof productStatusEnum)[number];

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  modelNumber: text("model_number").notNull().default(""),
  janCode: text("jan_code"),
  price: integer("price").notNull().default(0),
  description: text("description"),
  status: text("status").notNull().default("active").$type<ProductStatus>(),
  reviewCount: integer("review_count").notNull().default(0),
  amazonAffiliateUrl: text("amazon_affiliate_url"),
  asin: text("asin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
