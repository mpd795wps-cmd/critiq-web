import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { criteriaTable } from "./criteria";

// ── Rating votes (IP-based dedup) ────────────────────────────
export const ratingVotesTable = pgTable(
  "rating_votes",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteriaTable.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("rating_vote_unique").on(t.productId, t.criterionId, t.ipAddress)],
);

export type RatingVote = typeof ratingVotesTable.$inferSelect;

// ── Helpful votes (IP-based dedup) ───────────────────────────
export const helpfulVotesTable = pgTable(
  "helpful_votes",
  {
    id: serial("id").primaryKey(),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteriaTable.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("helpful_vote_unique").on(t.criterionId, t.ipAddress)],
);

export type HelpfulVote = typeof helpfulVotesTable.$inferSelect;
