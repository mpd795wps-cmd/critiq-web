import { Router } from "express";
import { db, criteriaTable } from "@workspace/db";
import { eq, asc, and, inArray } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth.js";

const router = Router();
router.use(requireAdmin);

const toDto = (c: typeof criteriaTable.$inferSelect) => ({
  id: c.id, categoryId: c.categoryId, name: c.name,
  description: c.description, status: c.status, sortOrder: c.sortOrder,
  searchCount: c.searchCount,
});

router.get("/admin/criteria", async (req, res): Promise<void> => {
  const catId = req.query.categoryId ? parseInt(String(req.query.categoryId), 10) : null;
  const rows = catId && !isNaN(catId)
    ? await db.select().from(criteriaTable).where(eq(criteriaTable.categoryId, catId)).orderBy(asc(criteriaTable.sortOrder))
    : await db.select().from(criteriaTable).orderBy(asc(criteriaTable.categoryId), asc(criteriaTable.sortOrder));
  res.json(rows.map(toDto));
});

router.post("/admin/criteria", async (req, res): Promise<void> => {
  const { categoryId, name, description, status, sortOrder } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "categoryId と name は必須です" }); return;
  }
  const [row] = await db.insert(criteriaTable).values({
    categoryId,
    name: name.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    status: status === "archived" ? "archived" : "active",
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
  }).returning();
  res.status(201).json(toDto(row));
});

router.put("/admin/criteria/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { categoryId, name, description, status, sortOrder } = req.body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name は必須です" }); return;
  }
  const updateData: Record<string, unknown> = {
    name: name.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    status: status === "archived" ? "archived" : "active",
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
  };
  if (typeof categoryId === "number") updateData.categoryId = categoryId;
  const [row] = await db.update(criteriaTable).set(updateData).where(eq(criteriaTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toDto(row));
});

router.delete("/admin/criteria/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(criteriaTable).where(eq(criteriaTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// POST /admin/criteria/apply-search-order?categoryId=N
// Re-assigns sort_order values within a category based on search_count ASC
router.post("/admin/criteria/apply-search-order", async (req, res): Promise<void> => {
  const catId = req.query.categoryId ? parseInt(String(req.query.categoryId), 10) : NaN;
  if (isNaN(catId)) { res.status(400).json({ error: "categoryId が必要です" }); return; }

  const rows = await db
    .select()
    .from(criteriaTable)
    .where(eq(criteriaTable.categoryId, catId))
    .orderBy(asc(criteriaTable.searchCount), asc(criteriaTable.id));

  // Assign 0, 1, 2, … in search_count ascending order
  await Promise.all(
    rows.map((r, i) =>
      db.update(criteriaTable).set({ sortOrder: i }).where(eq(criteriaTable.id, r.id))
    )
  );

  const updated = await db
    .select()
    .from(criteriaTable)
    .where(eq(criteriaTable.categoryId, catId))
    .orderBy(asc(criteriaTable.sortOrder));

  res.json(updated.map(toDto));
});

export default router;
