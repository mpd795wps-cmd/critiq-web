import { Router } from "express";
import { db, criterionSuggestionsTable, productSuggestionsTable, productsTable, productImagesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /criterion-suggestions
router.post("/criterion-suggestions", async (req, res): Promise<void> => {
  const { categoryId, name, description, reason } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "categoryId, name, description は必須です" }); return;
  }
  const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) { res.status(400).json({ error: "カテゴリが存在しません" }); return; }

  await db.insert(criterionSuggestionsTable).values({
    categoryId, name: name.trim(), description: description.trim(),
    reason: typeof reason === "string" ? reason.trim() || null : null,
  });
  res.status(201).json({ ok: true });
});

// POST /product-suggestions
router.post("/product-suggestions", async (req, res): Promise<void> => {
  const { categoryId, brand, name, modelNumber, janCode, price, description, images } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof brand !== "string" || !brand.trim() || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "categoryId, brand, name は必須です" }); return;
  }
  const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) { res.status(400).json({ error: "カテゴリが存在しません" }); return; }

  await db.insert(productSuggestionsTable).values({
    categoryId,
    brand: brand.trim(),
    name: (name as string).trim(),
    modelNumber: typeof modelNumber === "string" ? modelNumber.trim() : "",
    janCode: typeof janCode === "string" && janCode.trim() ? janCode.trim() : null,
    price: typeof price === "number" ? price : null,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    images: Array.isArray(images) ? images.filter((u): u is string => typeof u === "string") : [],
  });
  res.status(201).json({ ok: true });
});

export default router;
