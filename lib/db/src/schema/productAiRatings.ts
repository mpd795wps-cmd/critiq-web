import {
  pgTable,
  serial,
  integer,
  numeric,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products.js";
import { criteriaTable } from "./criteria.js";

export const aiRatingStatusEnum = [
  "draft",
  "pending",
  "published",
] as const;

export type AiRatingStatus = (typeof aiRatingStatusEnum)[number];

export const productAiRatingsTable = pgTable(
  "product_ai_ratings",
  {
    id: serial("id").primaryKey(),

    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),

    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteriaTable.id, { onDelete: "cascade" }),

    score: numeric("score", { precision: 4, scale: 2 }).notNull(),

    reason: text("reason").notNull(),

    status: text("status")
      .notNull()
      .default("draft")
      .$type<AiRatingStatus>(),

    published: boolean("published").notNull().default(false),

    aiModel: text("ai_model"),

    generatedAt: timestamp("generated_at", { withTimezone: true }),

    approvedAt: timestamp("approved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("product_ai_rating_unique").on(
      t.productId,
      t.criterionId,
    ),
  ],
);

export const insertProductAiRatingSchema =
  createInsertSchema(productAiRatingsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type InsertProductAiRating =
  z.infer<typeof insertProductAiRatingSchema>;

export type ProductAiRating =
  typeof productAiRatingsTable.$inferSelect;
