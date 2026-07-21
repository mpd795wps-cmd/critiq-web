import { Router } from "express";
import { db, productsTable, productImagesTable, productRatingsTable, criteriaTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

// GET /products/:productId
router.get("/products/:productId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [product] = await db.select().from(productsTable).where(
    and(eq(productsTable.id, id), eq(productsTable.status, "active"))
  );
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const images = await db
    .select({ url: productImagesTable.url })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, id))
    .orderBy(asc(productImagesTable.sortOrder));

  const ratings = await db
    .select()
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, id));

  res.json({
    id: product.id, categoryId: product.categoryId, name: product.name, brand: product.brand,
    modelNumber: product.modelNumber, janCode: product.janCode, price: product.price,
    description: product.description, status: product.status, reviewCount: product.reviewCount,
    images: images.map((i) => i.url),
    ratings: ratings.map((r) => ({
      criterionId: r.criterionId, score: parseFloat(String(r.score)), count: r.count,
    })),
  });
});

// POST /products/:productId/ratings
router.post("/products/:productId/ratings", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { scores } = req.body as { scores?: Record<string, number> };
  if (!scores || typeof scores !== "object") {
    res.status(400).json({ error: "scores object required" }); return;
  }

  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  // Upsert each criterion rating using weighted average
  for (const [criterionIdStr, newScore] of Object.entries(scores)) {
    const criterionId = parseInt(criterionIdStr, 10);
    if (isNaN(criterionId) || newScore < 1 || newScore > 5) continue;

    const [existing] = await db
      .select()
      .from(productRatingsTable)
      .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));

    if (existing) {
      const newCount = existing.count + 1;
      const newAvg = (parseFloat(String(existing.score)) * existing.count + newScore) / newCount;
      await db
        .update(productRatingsTable)
        .set({ score: String(newAvg.toFixed(2)), count: newCount })
        .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));
    } else {
      // Validate criterion belongs to same category as product
      const [criterion] = await db.select({ id: criteriaTable.id }).from(criteriaTable).where(eq(criteriaTable.id, criterionId));
      if (!criterion) continue;
      await db.insert(productRatingsTable).values({
        productId: id, criterionId, score: String(newScore), count: 1,
      });
    }
  }

  // Update review_count
  await db.update(productsTable)
    .set({ reviewCount: (await db.select({ count: productRatingsTable.count }).from(productRatingsTable).where(eq(productRatingsTable.productId, id))).reduce((a, b) => Math.max(a, b.count), 0) })
    .where(eq(productsTable.id, id));

  res.json({ ok: true });
});

export default router;
