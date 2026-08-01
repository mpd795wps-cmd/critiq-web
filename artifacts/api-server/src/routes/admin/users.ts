import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth.js";

const router = Router();
router.use(requireAdmin);

// GET /admin/users
router.get("/admin/users", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(asc(usersTable.createdAt));
  res.json(rows);
});

// DELETE /admin/users/:id
router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
