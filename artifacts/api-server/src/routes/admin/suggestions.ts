import { Router } from "express";
import {
  db, criterionSuggestionsTable, productSuggestionsTable,
  criteriaTable, productsTable, productImagesTable,
  productRatingsTable, categoriesTable, ratingVotesTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "../../lib/adminAuth";
import { sendMail, criterionApprovedMail, criterionRejectedMail, productApprovedMail, productRejectedMail } from "../../lib/mailer";

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
    reason: r.reason, submitterUsername: r.submitterUsername, submitterEmail: r.submitterEmail,
    status: r.status, adminNotes: r.adminNotes, createdAt: r.createdAt.toISOString(),
  })));
});

router.patch("/admin/criterion-suggestions/:id/review", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status, adminNotes, name: overrideName, description: overrideDescription } =
    req.body as { status?: string; adminNotes?: string; name?: string; description?: string };

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は approved / rejected のいずれか" }); return;
  }

  const [suggestion] = await db.update(criterionSuggestionsTable)
    .set({ status: status as "approved" | "rejected", adminNotes: adminNotes ?? null })
    .where(eq(criterionSuggestionsTable.id, id)).returning();
  if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

  let resultingCriterionId: number | null = null;

  if (status === "approved") {
    const existing = await db.select({ sortOrder: criteriaTable.sortOrder })
      .from(criteriaTable).where(eq(criteriaTable.categoryId, suggestion.categoryId))
      .orderBy(desc(criteriaTable.sortOrder)).limit(1);
    const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    const [newCriterion] = await db.insert(criteriaTable).values({
      categoryId: suggestion.categoryId,
      name: overrideName?.trim() || suggestion.name,
      description: overrideDescription?.trim() || suggestion.description,
      status: "active",
      sortOrder: nextOrder,
      isOfficial: false,
      createdByUsername: suggestion.submitterUsername ?? null,
    }).returning({ id: criteriaTable.id });

    resultingCriterionId = newCriterion.id;

    // Link criterion back to suggestion
    await db.update(criterionSuggestionsTable)
      .set({ resultingCriterionId: newCriterion.id })
      .where(eq(criterionSuggestionsTable.id, id));
  }

  // Send email notification if submitter email is known
  if (suggestion.submitterEmail) {
    // Fetch category name for the email
    const [cat] = await db.select({ name: categoriesTable.name })
      .from(categoriesTable).where(eq(categoriesTable.id, suggestion.categoryId));

    if (status === "approved") {
      await sendMail(criterionApprovedMail({
        to: suggestion.submitterEmail,
        criterionName: overrideName?.trim() || suggestion.name,
        categoryName: cat?.name ?? "",
      }));
    } else {
      await sendMail(criterionRejectedMail({
        to: suggestion.submitterEmail,
        criterionName: suggestion.name,
        adminNotes,
      }));
    }
  }

  res.json({
    id: suggestion.id, categoryId: suggestion.categoryId, name: suggestion.name,
    description: suggestion.description, reason: suggestion.reason,
    submitterUsername: suggestion.submitterUsername,
    status: suggestion.status, adminNotes: suggestion.adminNotes,
    resultingCriterionId,
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
    description: r.description, referenceUrl: r.referenceUrl, images: r.images, status: r.status,
    submitterEmail: r.submitterEmail,
    hasPendingRatings: !!r.pendingRatings,
    adminNotes: r.adminNotes, createdAt: r.createdAt.toISOString(),
  })));
});

router.patch("/admin/product-suggestions/:id/review", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status, adminNotes, brand, name, modelNumber, janCode, price, description, images } =
    req.body as {
      status?: string; adminNotes?: string;
      brand?: string; name?: string; modelNumber?: string;
      janCode?: string; price?: number; description?: string; images?: string[];
    };

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status は approved / rejected のいずれか" }); return;
  }

  const [suggestion] = await db.update(productSuggestionsTable)
    .set({ status: status as "approved" | "rejected", adminNotes: adminNotes ?? null })
    .where(eq(productSuggestionsTable.id, id)).returning();
  if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

  if (status === "approved") {
    const [product] = await db.insert(productsTable).values({
      categoryId: suggestion.categoryId,
      brand: brand?.trim() || suggestion.brand,
      name: name?.trim() || suggestion.name,
      modelNumber: modelNumber?.trim() ?? suggestion.modelNumber,
      janCode: janCode ?? suggestion.janCode,
      price: price ?? suggestion.price ?? 0,
      description: description?.trim() ?? suggestion.description,
      status: "active",
    }).returning();

    const finalImages = images ?? suggestion.images;
    if (finalImages.length > 0) {
      await Promise.all(finalImages.map((url, i) =>
        db.insert(productImagesTable).values({ productId: product.id, url, sortOrder: i })
      ));
    }

    // Apply pending ratings if any
    if (suggestion.pendingRatings) {
      try {
        const pendingRatings = JSON.parse(suggestion.pendingRatings) as Record<string, number>;
        const dummyIp = `pending-suggestion-${suggestion.id}`;

        for (const [criterionIdStr, score] of Object.entries(pendingRatings)) {
          const criterionId = parseInt(criterionIdStr, 10);
          if (isNaN(criterionId) || score < 1 || score > 5) continue;

          const [criterion] = await db.select({ id: criteriaTable.id }).from(criteriaTable).where(eq(criteriaTable.id, criterionId));
          if (!criterion) continue;

          // Insert vote record (use dummy IP for pending suggestion)
          await db.insert(ratingVotesTable).values({ productId: product.id, criterionId, ipAddress: dummyIp, score }).catch(() => {});

          // Insert rating
          const [existing] = await db.select().from(productRatingsTable)
            .where(and(eq(productRatingsTable.productId, product.id), eq(productRatingsTable.criterionId, criterionId)));

          if (!existing) {
            await db.insert(productRatingsTable).values({
              productId: product.id, criterionId, score: String(score), count: 1,
            });
          }
        }

        // Update review count
        const allRatings = await db.select({ count: productRatingsTable.count })
          .from(productRatingsTable).where(eq(productRatingsTable.productId, product.id));
        const reviewCount = allRatings.reduce((a, b) => Math.max(a, b.count), 0);
        await db.update(productsTable).set({ reviewCount }).where(eq(productsTable.id, product.id));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // Send email notification
  if (suggestion.submitterEmail) {
    const productName = name?.trim() || suggestion.name;
    if (status === "approved") {
      await sendMail(productApprovedMail({ to: suggestion.submitterEmail, productName }));
    } else {
      await sendMail(productRejectedMail({ to: suggestion.submitterEmail, productName, adminNotes }));
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
