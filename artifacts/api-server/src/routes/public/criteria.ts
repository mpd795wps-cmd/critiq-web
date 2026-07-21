import { Router } from "express";
import { db, criteriaTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";

const router = Router();

// POST /criteria/:id/helpful — increment helpful_count (no auth required)
router.post("/criteria/:id/helpful", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(criteriaTable)
    .set({ helpfulCount: sql`${criteriaTable.helpfulCount} + 1` })
    .where(eq(criteriaTable.id, id))
    .returning({ helpfulCount: criteriaTable.helpfulCount });

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true, helpfulCount: updated.helpfulCount });
});

// POST /criteria/track-search — increment search_count for multiple criteria
router.post("/criteria/track-search", async (req, res): Promise<void> => {
  const { ids } = req.body as { ids?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) { res.json({ ok: true }); return; }
  const validIds = ids.map((v) => parseInt(String(v), 10)).filter((n) => !isNaN(n));
  if (validIds.length === 0) { res.json({ ok: true }); return; }

  await db
    .update(criteriaTable)
    .set({ searchCount: sql`${criteriaTable.searchCount} + 1` })
    .where(inArray(criteriaTable.id, validIds));

  res.json({ ok: true });
});

export default router;
