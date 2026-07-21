import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth";

const router = Router();
router.use(requireAdmin);

const toDto = (c: typeof categoriesTable.$inferSelect) => ({
  id: c.id, slug: c.slug, name: c.name, icon: c.icon, sortOrder: c.sortOrder,
});

router.get("/admin/categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
  res.json(rows.map(toDto));
});

router.post("/admin/categories", async (req, res): Promise<void> => {
  const { slug, name, icon, sortOrder } = req.body as Record<string, unknown>;
  if (typeof slug !== "string" || !slug.trim() || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "slug と name は必須です" }); return;
  }
  const [row] = await db.insert(categoriesTable).values({
    slug: slug.trim(), name: name.trim(),
    icon: typeof icon === "string" ? icon : "",
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
  }).returning();
  res.status(201).json(toDto(row));
});

router.put("/admin/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { slug, name, icon, sortOrder } = req.body as Record<string, unknown>;
  if (typeof slug !== "string" || !slug.trim() || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "slug と name は必須です" }); return;
  }
  const [row] = await db.update(categoriesTable).set({
    slug: slug.trim(), name: name.trim(),
    icon: typeof icon === "string" ? icon : "",
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
  }).where(eq(categoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toDto(row));
});

router.delete("/admin/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
