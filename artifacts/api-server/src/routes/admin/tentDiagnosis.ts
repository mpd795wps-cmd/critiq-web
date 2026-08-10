import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  productsTable,
  productTentDiagnosisProfilesTable,
  productTentSpecsTable,
} from "@workspace/db";
import { requireAdmin } from "../../lib/adminAuth.js";

const router = Router();
router.use(requireAdmin);

type BulkEntry = {
  productId: number;
  specs?: Record<string, unknown>;
  diagnosis?: Record<string, unknown>;
};

const integerOrNull = (value: unknown) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
const scoreOrNull = (value: unknown) => {
  const parsed = integerOrNull(value);
  return parsed !== null && parsed >= 1 && parsed <= 5 ? parsed : null;
};
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 10) : [];

router.put("/admin/tent-diagnosis/bulk", async (req, res): Promise<void> => {
  const entries = (req.body as { entries?: BulkEntry[] }).entries;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 100) {
    res.status(400).json({ error: "entries は1～100件で指定してください" }); return;
  }
  const ids = [...new Set(entries.map((entry) => Number(entry.productId)).filter(Number.isInteger))];
  const existing = await db.select({ id: productsTable.id }).from(productsTable).where(inArray(productsTable.id, ids));
  const existingIds = new Set(existing.map((item) => item.id));
  let saved = 0;

  for (const entry of entries) {
    if (!existingIds.has(entry.productId)) continue;
    const spec = entry.specs ?? {};
    const diagnosis = entry.diagnosis ?? {};
    const specValues = {
      productId: entry.productId,
      officialUrl: typeof spec.officialUrl === "string" ? spec.officialUrl : null,
      tentType: typeof spec.tentType === "string" ? spec.tentType : null,
      manufacturerCapacity: integerOrNull(spec.manufacturerCapacity),
      innerWidthCm: integerOrNull(spec.innerWidthCm),
      innerDepthCm: integerOrNull(spec.innerDepthCm),
      innerHeightCm: integerOrNull(spec.innerHeightCm),
      packedLengthCm: integerOrNull(spec.packedLengthCm),
      packedDiameterCm: integerOrNull(spec.packedDiameterCm),
      weightKg: Number.isFinite(Number(spec.weightKg)) ? String(Number(spec.weightKg)) : null,
      flyWaterproofMm: integerOrNull(spec.flyWaterproofMm),
      floorWaterproofMm: integerOrNull(spec.floorWaterproofMm),
      hasSkirt: typeof spec.hasSkirt === "boolean" ? spec.hasSkirt : null,
      hasLargeMesh: typeof spec.hasLargeMesh === "boolean" ? spec.hasLargeMesh : null,
      materials: typeof spec.materials === "string" ? spec.materials : null,
      sourceCheckedAt: spec.sourceCheckedAt ? new Date(String(spec.sourceCheckedAt)) : null,
    };
    await db.insert(productTentSpecsTable).values(specValues).onConflictDoUpdate({
      target: productTentSpecsTable.productId,
      set: { ...specValues, productId: undefined, updatedAt: new Date() },
    });

    const profileValues = {
      productId: entry.productId,
      comfortableAdultsMin: integerOrNull(diagnosis.comfortableAdultsMin),
      comfortableAdultsMax: integerOrNull(diagnosis.comfortableAdultsMax),
      comfortableChildrenMax: integerOrNull(diagnosis.comfortableChildrenMax),
      beginnerScore: scoreOrNull(diagnosis.beginnerScore),
      soloSetupScore: scoreOrNull(diagnosis.soloSetupScore),
      familyScore: scoreOrNull(diagnosis.familyScore),
      summerScore: scoreOrNull(diagnosis.summerScore),
      winterScore: scoreOrNull(diagnosis.winterScore),
      rainScore: scoreOrNull(diagnosis.rainScore),
      windScore: scoreOrNull(diagnosis.windScore),
      portabilityScore: scoreOrNull(diagnosis.portabilityScore),
      livabilityScore: scoreOrNull(diagnosis.livabilityScore),
      setupEaseScore: scoreOrNull(diagnosis.setupEaseScore),
      budgetBand: integerOrNull(diagnosis.budgetBand),
      recommendedFor: stringArray(diagnosis.recommendedFor),
      cautions: stringArray(diagnosis.cautions),
      reasoning: typeof diagnosis.reasoning === "string" ? diagnosis.reasoning : null,
      confidence: ["low", "medium", "high"].includes(String(diagnosis.confidence)) ? String(diagnosis.confidence) : "medium",
      status: diagnosis.status === "published" ? "published" as const : "draft" as const,
    };
    await db.insert(productTentDiagnosisProfilesTable).values(profileValues).onConflictDoUpdate({
      target: productTentDiagnosisProfilesTable.productId,
      set: { ...profileValues, productId: undefined, updatedAt: new Date() },
    });
    saved += 1;
  }
  res.json({ ok: true, saved });
});

router.get("/admin/products/:id/tent-diagnosis", async (req, res): Promise<void> => {
  const productId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [specs, diagnosis] = await Promise.all([
    db.select().from(productTentSpecsTable).where(eq(productTentSpecsTable.productId, productId)).limit(1),
    db.select().from(productTentDiagnosisProfilesTable).where(eq(productTentDiagnosisProfilesTable.productId, productId)).limit(1),
  ]);
  res.json({ specs: specs[0] ?? null, diagnosis: diagnosis[0] ?? null });
});

export default router;
