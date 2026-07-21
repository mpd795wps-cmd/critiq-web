import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";
import { criteriaTable } from "./criteria";

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
  submitterUsername: text("submitter_username"),
  submitterUserId: integer("submitter_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  submitterEmail: text("submitter_email"),
  resultingCriterionId: integer("resulting_criterion_id").references(() => criteriaTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending").$type<SuggestionStatus>(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCriterionSuggestionSchema = createInsertSchema(criterionSuggestionsTable).omit({
  id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true,
  resultingCriterionId: true,
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
  submitterUserId: integer("submitter_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  submitterEmail: text("submitter_email"),
  // JSON string: Record<criterionId, score> — ratings to apply when approved
  pendingRatings: text("pending_ratings"),
  status: text("status").notNull().default("pending").$type<SuggestionStatus>(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSuggestionSchema = createInsertSchema(productSuggestionsTable).omit({
  id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true,
  submitterUserId: true, submitterEmail: true, pendingRatings: true,
});
export type InsertProductSuggestion = z.infer<typeof insertProductSuggestionSchema>;
export type ProductSuggestion = typeof productSuggestionsTable.$inferSelect;
