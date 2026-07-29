import { Router } from "express";
import { db, productsTable, productImagesTable, productRatingsTable, criteriaTable } from "@workspace/db";
import { eq, asc, desc, and, SQL } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth";

const router = Router();
router.use(requireAdmin);

async function buildProductDto(p: typeof productsTable.$inferSelect) {
  const images = await db.select({ url: productImagesTable.url })
    .from(productImagesTable).where(eq(productImagesTable.productId, p.id))
    .orderBy(asc(productImagesTable.sortOrder));
  return {
    id: p.id, categoryId: p.categoryId, name: p.name, brand: p.brand,
    modelNumber: p.modelNumber, janCode: p.janCode, price: p.price,
    description: p.description, status: p.status, reviewCount: p.reviewCount,
    images: images.map((i) => i.url),
    amazonAffiliateUrl: p.amazonAffiliateUrl ?? null,
    asin: p.asin ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/admin/products", async (req, res): Promise<void> => {
  const { status, categoryId } = req.query;
  let q = db.select().from(productsTable).$dynamic();
  const conditions: SQL[] = [];
  if (status && typeof status === "string") conditions.push(eq(productsTable.status, status as "active" | "pending" | "rejected"));
  if (categoryId) {
    const cid = parseInt(String(categoryId), 10);
    if (!isNaN(cid)) conditions.push(eq(productsTable.categoryId, cid));
  }
  if (conditions.length === 1) q = q.where(conditions[0]);
  else if (conditions.length > 1) q = q.where(and(...conditions));
  const rows = await q.orderBy(asc(productsTable.createdAt));
  res.json(await Promise.all(rows.map(buildProductDto)));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const { categoryId, name, brand, modelNumber, janCode, price, description, status, images, amazonAffiliateUrl, asin } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof name !== "string" || !name.trim() || typeof brand !== "string" || !brand.trim()) {
    res.status(400).json({ error: "categoryId, name, brand は必須です" }); return;
  }
  const rawAmazonUrl = typeof amazonAffiliateUrl === "string" ? amazonAffiliateUrl.trim() : null;
  const validAmazonUrl = rawAmazonUrl && /^https?:\/\//i.test(rawAmazonUrl) ? rawAmazonUrl : null;
  const [product] = await db.insert(productsTable).values({
    categoryId, name: name.trim(), brand: brand.trim(),
    modelNumber: typeof modelNumber === "string" ? modelNumber.trim() : "",
    janCode: typeof janCode === "string" && janCode.trim() ? janCode.trim() : null,
    price: typeof price === "number" ? price : 0,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    status: (status === "pending" || status === "rejected") ? status : "active",
    amazonAffiliateUrl: validAmazonUrl,
    asin: typeof asin === "string" && asin.trim() ? asin.trim().toUpperCase() : null,
  }).returning();
  if (Array.isArray(images)) {
    await Promise.all((images as string[]).map((url, i) =>
      db.insert(productImagesTable).values({ productId: product.id, url, sortOrder: i })
    ));
  }
  res.status(201).json(await buildProductDto(product));
});

router.put("/admin/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { categoryId, name, brand, modelNumber, janCode, price, description, status, images, amazonAffiliateUrl, asin } = req.body as Record<string, unknown>;
  const rawAmazonUrl = typeof amazonAffiliateUrl === "string" ? amazonAffiliateUrl.trim() : null;
  const validAmazonUrl = rawAmazonUrl && /^https?:\/\//i.test(rawAmazonUrl) ? rawAmazonUrl : null;
  const [product] = await db.update(productsTable).set({
    ...(typeof categoryId === "number" ? { categoryId } : {}),
    ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
    ...(typeof brand === "string" && brand.trim() ? { brand: brand.trim() } : {}),
    ...(typeof modelNumber === "string" ? { modelNumber: modelNumber.trim() } : {}),
    janCode: typeof janCode === "string" && janCode.trim() ? janCode.trim() : null,
    ...(typeof price === "number" ? { price } : {}),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    ...(status ? { status: status as "active" | "pending" | "rejected" } : {}),
    amazonAffiliateUrl: "amazonAffiliateUrl" in (req.body as object) ? validAmazonUrl : undefined,
    asin: "asin" in (req.body as object) ? (typeof asin === "string" && asin.trim() ? asin.trim().toUpperCase() : null) : undefined,
  }).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (Array.isArray(images)) {
    await db.delete(productImagesTable).where(eq(productImagesTable.productId, id));
    await Promise.all((images as string[]).map((url, i) =>
      db.insert(productImagesTable).values({ productId: id, url, sortOrder: i })
    ));
  }
  res.json(await buildProductDto(product));
});

router.patch("/admin/products/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body as { status?: string };
  if (!status || !["active", "pending", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は active / pending / rejected のいずれか" }); return;
  }
  const [product] = await db.update(productsTable)
    .set({ status: status as "active" | "pending" | "rejected" })
    .where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await buildProductDto(product));
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// GET /admin/products/:id/ratings — 基準別評価一覧
router.get("/admin/products/:id/ratings", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db
    .select({
      criterionId: productRatingsTable.criterionId,
      criterionName: criteriaTable.name,
      score: productRatingsTable.score,
      count: productRatingsTable.count,
    })
    .from(productRatingsTable)
    .leftJoin(criteriaTable, eq(productRatingsTable.criterionId, criteriaTable.id))
    .where(eq(productRatingsTable.productId, id))
    .orderBy(desc(productRatingsTable.score));
  res.json(rows);
});

export default router;
