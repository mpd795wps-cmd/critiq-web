import { Router } from "express";
import { db, criterionSuggestionsTable, productSuggestionsTable, criteriaTable, productsTable, productImagesTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth";

const router = Router();
router.use(requireAdmin);

// ── Criterion suggestions ─────────────────────────────────────
router.get("/admin/criterion-suggestions", async (req, res): Promise<void> => {
  const { status } = req.query;
  let q = db.select().from(criterionSuggestionsTable).$dynamic();
  if (status && typeof status === "string") q = q.where(eq(criterionSuggestionsTable.status, status as "pending" | "approved" | "rejected"));
  const rows = await q.orderBy(desc(criterionSuggestionsTable.createdAt));
  res.json(rows.map((r) => ({
    id: r.id, categoryId: r.categoryId, name: r.name, description: r.description,
    reason: r.reason, status: r.status, adminNotes: r.adminNotes,
    createdAt: r.createdAt.toISOString(),
  })));
});

// PATCH /admin/criterion-suggestions/:id/review
// When approved, also create the actual criterion
router.patch("/admin/criterion-suggestions/:id/review", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は approved / rejected のいずれか" }); return;
  }

  const [suggestion] = await db.update(criterionSuggestionsTable)
    .set({ status: status as "approved" | "rejected", adminNotes: adminNotes ?? null })
    .where(eq(criterionSuggestionsTable.id, id)).returning();
  if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

  if (status === "approved") {
    // Determine next sort_order for this category
    const existing = await db.select({ sortOrder: criteriaTable.sortOrder })
      .from(criteriaTable).where(eq(criteriaTable.categoryId, suggestion.categoryId))
      .orderBy(desc(criteriaTable.sortOrder)).limit(1);
    const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    await db.insert(criteriaTable).values({
      categoryId: suggestion.categoryId,
      name: suggestion.name,
      description: suggestion.description,
      status: "active",
      sortOrder: nextOrder,
    });
  }

  res.json({
    id: suggestion.id, categoryId: suggestion.categoryId, name: suggestion.name,
    description: suggestion.description, reason: suggestion.reason,
    status: suggestion.status, adminNotes: suggestion.adminNotes,
    createdAt: suggestion.createdAt.toISOString(),
  });
});

// ── Product suggestions ───────────────────────────────────────
router.get("/admin/product-suggestions", async (req, res): Promise<void> => {
  const { status } = req.query;
  let q = db.select().from(productSuggestionsTable).$dynamic();
  if (status && typeof status === "string") q = q.where(eq(productSuggestionsTable.status, status as "pending" | "approved" | "rejected"));
  const rows = await q.orderBy(desc(productSuggestionsTable.createdAt));
  res.json(rows.map((r) => ({
    id: r.id, categoryId: r.categoryId, brand: r.brand, name: r.name,
    modelNumber: r.modelNumber, janCode: r.janCode, price: r.price,
    description: r.description, images: r.images, status: r.status,
    adminNotes: r.adminNotes, createdAt: r.createdAt.toISOString(),
  })));
});

// PATCH /admin/product-suggestions/:id/review
router.patch("/admin/product-suggestions/:id/review", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は approved / rejected のいずれか" }); return;
  }

  const [suggestion] = await db.update(productSuggestionsTable)
    .set({ status: status as "approved" | "rejected", adminNotes: adminNotes ?? null })
    .where(eq(productSuggestionsTable.id, id)).returning();
  if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

  if (status === "approved") {
    // Create the actual product from the suggestion
    const [product] = await db.insert(productsTable).values({
      categoryId: suggestion.categoryId,
      brand: suggestion.brand,
      name: suggestion.name,
      modelNumber: suggestion.modelNumber,
      janCode: suggestion.janCode,
      price: suggestion.price ?? 0,
      description: suggestion.description,
      status: "active",
    }).returning();
    // Insert images
    if (suggestion.images.length > 0) {
      await Promise.all(suggestion.images.map((url, i) =>
        db.insert(productImagesTable).values({ productId: product.id, url, sortOrder: i })
      ));
    }
  }

  res.json({
    id: suggestion.id, categoryId: suggestion.categoryId, brand: suggestion.brand,
    name: suggestion.name, modelNumber: suggestion.modelNumber, janCode: suggestion.janCode,
    price: suggestion.price, description: suggestion.description, images: suggestion.images,
    status: suggestion.status, adminNotes: suggestion.adminNotes,
    createdAt: suggestion.createdAt.toISOString(),
  });
});

export default router;
