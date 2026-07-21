import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const suggestionStatusEnum = ["pending", "approved", "rejected"] as const;
export type SuggestionStatus = (typeof suggestionStatusEnum)[number];

// ── Criterion suggestions (from users via "育てる") ─────────────────
export const criterionSuggestionsTable = pgTable("criterion_suggestions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending").$type<SuggestionStatus>(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCriterionSuggestionSchema = createInsertSchema(criterionSuggestionsTable).omit({
  id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true,
});
export type InsertCriterionSuggestion = z.infer<typeof insertCriterionSuggestionSchema>;
export type CriterionSuggestion = typeof criterionSuggestionsTable.$inferSelect;

// ── Product suggestions (from users via "育てる") ──────────────────
export const productSuggestionsTable = pgTable("product_suggestions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  name: text("name").notNull(),
  modelNumber: text("model_number").notNull().default(""),
  janCode: text("jan_code"),
  price: integer("price"),
  description: text("description"),
  images: text("images").array().notNull().default([]),
  status: text("status").notNull().default("pending").$type<SuggestionStatus>(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSuggestionSchema = createInsertSchema(productSuggestionsTable).omit({
  id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true,
});
export type InsertProductSuggestion = z.infer<typeof insertProductSuggestionSchema>;
export type ProductSuggestion = typeof productSuggestionsTable.$inferSelect;
