import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { categoriesTable } from "./categories.js";

export const categorySuggestionsTable = pgTable("category_suggestions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  submitterUserId: integer("submitter_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  submitterEmail: text("submitter_email"),
  resultingCategoryId: integer("resulting_category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "rejected">(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CategorySuggestion = typeof categorySuggestionsTable.$inferSelect;
