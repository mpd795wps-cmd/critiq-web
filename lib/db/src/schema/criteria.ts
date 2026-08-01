import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories.js";

export const criteriaStatusEnum = ["active", "archived"] as const;
export type CriteriaStatus = (typeof criteriaStatusEnum)[number];

export const criteriaTable = pgTable("criteria", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active").$type<CriteriaStatus>(),
  sortOrder: integer("sort_order").notNull().default(0),
  // Creator info
  isOfficial: boolean("is_official").notNull().default(true),
  createdByUsername: text("created_by_username"), // denormalized for fast reads; null = official
  // Engagement
  helpfulCount: integer("helpful_count").notNull().default(0),
  searchCount: integer("search_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCriterionSchema = createInsertSchema(criteriaTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCriterion = z.infer<typeof insertCriterionSchema>;
export type Criterion = typeof criteriaTable.$inferSelect;
