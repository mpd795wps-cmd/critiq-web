import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  productImagesTable,
  productTentDiagnosisProfilesTable,
  productTentSpecsTable,
} from "@workspace/db";

const router = Router();

type Answers = {
  categoryId?: number;
  adults?: number;
  children?: number;
  experience?: "first" | "some" | "experienced";
  setupPeople?: number;
  maxBudget?: number | null;
  priorities?: Array<"setup" | "space" | "rain" | "summer" | "portability" | "durability" | "price">;
  vehicle?: "bike" | "kei" | "compact" | "minivan" | "large";
  season?: "spring-autumn" | "summer" | "winter" | "all";
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const score5 = (value: number | null | undefined) => ((value ?? 3) - 1) * 25;

router.post("/diagnosis/tents", async (req, res): Promise<void> => {
  const answers = req.body as Answers;
  const adults = Number(answers.adults);
  const children = Number(answers.children);
  if (!Number.isInteger(adults) || adults < 1 || adults > 8 || !Number.isInteger(children) || children < 0 || children > 8) {
    res.status(400).json({ error: "大人と子どもの人数が正しくありません" });
    return;
  }

  const conditions = [
    eq(productsTable.status, "active"),
    eq(productTentDiagnosisProfilesTable.status, "published"),
  ];
  if (Number.isInteger(answers.categoryId)) conditions.push(eq(productsTable.categoryId, answers.categoryId!));

  const rows = await db
    .select({ product: productsTable, profile: productTentDiagnosisProfilesTable, spec: productTentSpecsTable })
    .from(productTentDiagnosisProfilesTable)
    .innerJoin(productsTable, eq(productsTable.id, productTentDiagnosisProfilesTable.productId))
    .leftJoin(productTentSpecsTable, eq(productTentSpecsTable.productId, productsTable.id))
    .where(and(...conditions));

  const priorities = new Set(answers.priorities ?? []);
  const requestedPeople = adults + children * 0.65;

  const scored = await Promise.all(rows.map(async ({ product, profile, spec }) => {
    const reasons: string[] = [];
    const cautions = [...profile.cautions];
    const weighted: Array<[number, number]> = [];

    const min = profile.comfortableAdultsMin ?? 1;
    const max = profile.comfortableAdultsMax ?? spec?.manufacturerCapacity ?? 1;
    let capacity = requestedPeople <= max ? 100 : requestedPeople <= max + 0.5 ? 55 : 0;
    if (requestedPeople < Math.max(1, min - 1)) capacity = 65;
    weighted.push([capacity, 4]);
    if (capacity >= 90) reasons.push("人数構成に合う広さです");

    if (answers.experience === "first") {
      weighted.push([score5(profile.beginnerScore), 2]);
      if ((profile.beginnerScore ?? 0) >= 4) reasons.push("初心者にも扱いやすいモデルです");
    }
    if ((answers.setupPeople ?? 2) === 1) {
      weighted.push([score5(profile.soloSetupScore), 3]);
      if ((profile.soloSetupScore ?? 0) <= 2) cautions.unshift("一人での設営には負担があります");
    }

    if (answers.maxBudget) {
      const budgetScore = product.price <= answers.maxBudget ? 100 : product.price <= answers.maxBudget * 1.15 ? 60 : 10;
      weighted.push([budgetScore, priorities.has("price") ? 4 : 2]);
      if (budgetScore === 100) reasons.push("希望予算の範囲内です");
      if (budgetScore <= 10) cautions.unshift("希望予算を大きく超えます");
    }

    const addPriority = (key: string, score: number | null, label: string) => {
      if (!priorities.has(key as never)) return;
      weighted.push([score5(score), 3]);
      if ((score ?? 0) >= 4) reasons.push(label);
    };
    addPriority("setup", profile.setupEaseScore, "設営しやすさを重視する条件に合います");
    addPriority("space", profile.livabilityScore, "居住性を重視する条件に合います");
    addPriority("rain", profile.rainScore, "雨への強さを重視する条件に合います");
    addPriority("summer", profile.summerScore, "夏中心のキャンプに向いています");
    addPriority("portability", profile.portabilityScore, "持ち運びやすさを重視する条件に合います");

    if (answers.season === "summer") weighted.push([score5(profile.summerScore), 2]);
    if (answers.season === "winter") weighted.push([score5(profile.winterScore), 3]);
    if (answers.season === "all") {
      weighted.push([score5(profile.summerScore), 1]);
      weighted.push([score5(profile.winterScore), 2]);
    }

    const weight = spec?.weightKg ? Number(spec.weightKg) : null;
    if (weight !== null) {
      const vehicleLimit = { bike: 6, kei: 15, compact: 20, minivan: 30, large: 40 }[answers.vehicle ?? "minivan"];
      const vehicleScore = weight <= vehicleLimit ? 100 : weight <= vehicleLimit * 1.25 ? 55 : 10;
      weighted.push([vehicleScore, answers.vehicle === "bike" ? 4 : 2]);
      if (vehicleScore <= 10) cautions.unshift("移動手段に対して重量・収納負担が大きい可能性があります");
    }

    const totalWeight = weighted.reduce((sum, [, weightValue]) => sum + weightValue, 0);
    const percentage = clamp(Math.round(weighted.reduce((sum, [value, weightValue]) => sum + value * weightValue, 0) / Math.max(1, totalWeight)));
    const images = await db.select({ url: productImagesTable.url }).from(productImagesTable)
      .where(eq(productImagesTable.productId, product.id)).orderBy(asc(productImagesTable.sortOrder)).limit(1);

    return {
      product: { ...product, images: images.map((image) => image.url) },
      percentage,
      reasons: [...new Set([...reasons, ...profile.recommendedFor])].slice(0, 3),
      cautions: [...new Set(cautions)].slice(0, 2),
      confidence: profile.confidence,
    };
  }));

  const eligible = scored.filter((item) => item.percentage >= 45).sort((a, b) => b.percentage - a.percentage);
  res.json({ results: eligible.slice(0, 5), totalEligible: eligible.length });
});

export default router;
