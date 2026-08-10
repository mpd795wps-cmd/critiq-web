import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products.js";

export const productTentSpecsTable = pgTable(
  "product_tent_specs",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
    officialUrl: text("official_url"),
    tentType: text("tent_type"),
    manufacturerCapacity: integer("manufacturer_capacity"),
    innerWidthCm: integer("inner_width_cm"),
    innerDepthCm: integer("inner_depth_cm"),
    innerHeightCm: integer("inner_height_cm"),
    packedLengthCm: integer("packed_length_cm"),
    packedDiameterCm: integer("packed_diameter_cm"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    flyWaterproofMm: integer("fly_waterproof_mm"),
    floorWaterproofMm: integer("floor_waterproof_mm"),
    hasSkirt: boolean("has_skirt"),
    hasLargeMesh: boolean("has_large_mesh"),
    materials: text("materials"),
    sourceCheckedAt: timestamp("source_checked_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("product_tent_specs_product_id_unique").on(table.productId)],
);

export type TentDiagnosisStatus = "draft" | "published";

export const productTentDiagnosisProfilesTable = pgTable(
  "product_tent_diagnosis_profiles",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
    comfortableAdultsMin: integer("comfortable_adults_min"),
    comfortableAdultsMax: integer("comfortable_adults_max"),
    comfortableChildrenMax: integer("comfortable_children_max"),
    beginnerScore: integer("beginner_score"),
    soloSetupScore: integer("solo_setup_score"),
    familyScore: integer("family_score"),
    summerScore: integer("summer_score"),
    winterScore: integer("winter_score"),
    rainScore: integer("rain_score"),
    windScore: integer("wind_score"),
    portabilityScore: integer("portability_score"),
    livabilityScore: integer("livability_score"),
    setupEaseScore: integer("setup_ease_score"),
    budgetBand: integer("budget_band"),
    recommendedFor: jsonb("recommended_for").$type<string[]>().notNull().default([]),
    cautions: jsonb("cautions").$type<string[]>().notNull().default([]),
    reasoning: text("reasoning"),
    confidence: text("confidence").notNull().default("medium"),
    status: text("status").notNull().default("draft").$type<TentDiagnosisStatus>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("product_tent_diagnosis_product_id_unique").on(table.productId)],
);

export const productTentSpecsRelations = relations(productTentSpecsTable, ({ one }) => ({
  product: one(productsTable, { fields: [productTentSpecsTable.productId], references: [productsTable.id] }),
}));

export const productTentDiagnosisRelations = relations(productTentDiagnosisProfilesTable, ({ one }) => ({
  product: one(productsTable, { fields: [productTentDiagnosisProfilesTable.productId], references: [productsTable.id] }),
}));
