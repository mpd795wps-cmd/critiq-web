import { Router } from "express";
import { db, criteriaTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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

export default router;
