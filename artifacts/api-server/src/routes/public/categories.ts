import { Router } from "express";
import {
  db,
  categoriesTable,
  criteriaTable,
  productsTable,
  productImagesTable,
  productRatingsTable,
  productAiRatingsTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

// GET /categories
router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.sortOrder));
  res.json(rows.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, icon: c.icon, sortOrder: c.sortOrder,
  })));
});

// GET /categories/:categoryId/criteria
router.get("/categories/:categoryId/criteria", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }

  const rows = await db
    .select()
    .from(criteriaTable)
    .where(and(eq(criteriaTable.categoryId, id), eq(criteriaTable.status, "active")))
    .orderBy(asc(criteriaTable.sortOrder));

  res.json(rows.map((c) => ({
    id: c.id, categoryId: c.categoryId, name: c.name,
    description: c.description, status: c.status, sortOrder: c.sortOrder,
    isOfficial: c.isOfficial, createdByUsername: c.createdByUsername, helpfulCount: c.helpfulCount,
  })));
});

// GET /categories/:categoryId/products
router.get("/categories/:categoryId/products", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.categoryId, id), eq(productsTable.status, "active")));

  const result = await Promise.all(products.map(async (p) => {
    const images = await db
      .select({ url: productImagesTable.url })
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, p.id))
      .orderBy(asc(productImagesTable.sortOrder));
    const ratings = await db
      .select()
      .from(productRatingsTable)
      .where(eq(productRatingsTable.productId, p.id));

    const aiRatings = await db
      .select({
        criterionId: productAiRatingsTable.criterionId,
        criterionName: criteriaTable.name,
        score: productAiRatingsTable.score,
        reason: productAiRatingsTable.reason,
      })
      .from(productAiRatingsTable)
      .leftJoin(
        criteriaTable,
        eq(productAiRatingsTable.criterionId, criteriaTable.id),
      )
      .where(
        and(
          eq(productAiRatingsTable.productId, p.id),
          eq(productAiRatingsTable.published, true),
        ),
      )
      .orderBy(asc(criteriaTable.sortOrder));

    return {
      id: p.id, categoryId: p.categoryId, name: p.name, brand: p.brand,
      modelNumber: p.modelNumber, janCode: p.janCode, price: p.price,
      description: p.description, status: p.status, reviewCount: p.reviewCount,
      images: images.map((i) => i.url),
      ratings: ratings.map((r) => ({
        criterionId: r.criterionId,
        score: parseFloat(String(r.score)),
        count: r.count,
      })),
      aiRatings: aiRatings.map((rating) => ({
        criterionId: rating.criterionId,
        criterionName: rating.criterionName,
        score: parseFloat(String(rating.score)),
        reason: rating.reason,
      })),
      amazonAffiliateUrl: p.amazonAffiliateUrl ?? null,
      asin: p.asin ?? null,
    };
  }));

  res.json(result);
});

export default router;
