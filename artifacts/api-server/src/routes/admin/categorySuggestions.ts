import { Router } from "express";
import { db, categorySuggestionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth.js";
import { sendMail, categoryApprovedMail, categoryRejectedMail } from "../../lib/mailer.js";

const router = Router();
router.use(requireAdmin);

router.get("/admin/category-suggestions", async (req, res): Promise<void> => {
  const { status } = req.query;
  let q = db.select().from(categorySuggestionsTable).$dynamic();
  if (status && typeof status === "string") {
    q = q.where(eq(categorySuggestionsTable.status, status as "pending" | "approved" | "rejected"));
  }
  const rows = await q.orderBy(desc(categorySuggestionsTable.createdAt));
  res.json(rows.map((r) => ({
    id: r.id, name: r.name, description: r.description,
    submitterEmail: r.submitterEmail, status: r.status,
    adminNotes: r.adminNotes, createdAt: r.createdAt.toISOString(),
  })));
});

router.patch("/admin/category-suggestions/:id/review", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は approved / rejected のいずれか" }); return;
  }

  const [suggestion] = await db.update(categorySuggestionsTable)
    .set({ status: status as "approved" | "rejected", adminNotes: adminNotes ?? null })
    .where(eq(categorySuggestionsTable.id, id)).returning();
  if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

  if (suggestion.submitterEmail) {
    if (status === "approved") {
      await sendMail(categoryApprovedMail({ to: suggestion.submitterEmail, categoryName: suggestion.name }));
    } else {
      await sendMail(categoryRejectedMail({ to: suggestion.submitterEmail, categoryName: suggestion.name, adminNotes }));
    }
  }

  res.json({
    id: suggestion.id, name: suggestion.name, description: suggestion.description,
    submitterEmail: suggestion.submitterEmail, status: suggestion.status,
    adminNotes: suggestion.adminNotes, createdAt: suggestion.createdAt.toISOString(),
  });
});

export default router;
