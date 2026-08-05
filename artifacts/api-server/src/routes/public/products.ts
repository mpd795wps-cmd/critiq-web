import { Router } from "express";
import {
  db,
  productsTable,
  productImagesTable,
  productRatingsTable,
  productAiRatingsTable,
  criteriaTable,
  productRatingCommentsTable,
  ratingVotesTable,
} from "@workspace/db";
import { eq, asc, and, sql } from "drizzle-orm";

const router = Router();

function getIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// GET /products/:productId
router.get("/products/:productId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [product] = await db.select().from(productsTable).where(
    and(eq(productsTable.id, id), eq(productsTable.status, "active"))
  );
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const images = await db
    .select({ url: productImagesTable.url })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, id))
    .orderBy(asc(productImagesTable.sortOrder));

  const ratings = await db
    .select()
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, id));

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
        eq(productAiRatingsTable.productId, id),
        eq(productAiRatingsTable.published, true),
      ),
    )
    .orderBy(asc(criteriaTable.sortOrder));

  res.json({
    id: product.id, categoryId: product.categoryId, name: product.name, brand: product.brand,
    modelNumber: product.modelNumber, janCode: product.janCode, price: product.price,
    description: product.description, status: product.status, reviewCount: product.reviewCount,
    images: images.map((i) => i.url),
    ratings: ratings.map((r) => ({
      criterionId: r.criterionId, score: parseFloat(String(r.score)), count: r.count,
    })),
    aiRatings: aiRatings.map((rating) => ({
      criterionId: rating.criterionId,
      criterionName: rating.criterionName,
      score: parseFloat(String(rating.score)),
      reason: rating.reason,
    })),
    amazonAffiliateUrl: product.amazonAffiliateUrl ?? null,
    asin: product.asin ?? null,
  });
});

// GET /products/:productId/comments
router.get("/products/:productId/comments", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const comments = await db
    .select({ id: productRatingCommentsTable.id, criterionId: productRatingCommentsTable.criterionId, comment: productRatingCommentsTable.comment, createdAt: productRatingCommentsTable.createdAt })
    .from(productRatingCommentsTable)
    .where(eq(productRatingCommentsTable.productId, id))
    .orderBy(asc(productRatingCommentsTable.createdAt));

  res.json(comments);
});

// GET /products/:productId/my-rating — return this IP's previous votes
router.get("/products/:productId/my-rating", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ip = getIp(req);
  const votes = await db
    .select({ criterionId: ratingVotesTable.criterionId, score: ratingVotesTable.score })
    .from(ratingVotesTable)
    .where(and(eq(ratingVotesTable.productId, id), eq(ratingVotesTable.ipAddress, ip)));
  const ratings: Record<number, number> = {};
  for (const v of votes) ratings[v.criterionId] = v.score;
  res.json({ ratings });
});

// POST /products/:productId/ratings — IP dedup per criterion (overwrite allowed)
router.post("/products/:productId/ratings", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { scores, comments } = req.body as { scores?: Record<string, number>; comments?: Record<string, string> };
  if (!scores || typeof scores !== "object") {
    res.status(400).json({ error: "scores object required" }); return;
  }

  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const ip = getIp(req);
  const skipped: number[] = [];

  for (const [criterionIdStr, newScore] of Object.entries(scores)) {
    const criterionId = parseInt(criterionIdStr, 10);
    if (isNaN(criterionId) || newScore < 1 || newScore > 5) continue;

    // IP dedup check
    const [existingVote] = await db
      .select({ id: ratingVotesTable.id, score: ratingVotesTable.score })
      .from(ratingVotesTable)
      .where(
        sql`${ratingVotesTable.productId} = ${id} AND ${ratingVotesTable.criterionId} = ${criterionId} AND ${ratingVotesTable.ipAddress} = ${ip}`
      );

    if (existingVote) {
      const oldScore = existingVote.score;
      if (oldScore === newScore) { skipped.push(criterionId); continue; }
      // Overwrite: update vote record
      await db.update(ratingVotesTable).set({ score: newScore }).where(eq(ratingVotesTable.id, existingVote.id));
      // Recalculate aggregate (count stays the same)
      const [agg] = await db.select().from(productRatingsTable)
        .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));
      if (agg) {
        const newAvg = (parseFloat(String(agg.score)) * agg.count - oldScore + newScore) / agg.count;
        await db.update(productRatingsTable)
          .set({ score: String(newAvg.toFixed(2)) })
          .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));
      }
      continue; // counted as accepted (not skipped)
    }

    // Insert vote record
    try {
      await db.insert(ratingVotesTable).values({ productId: id, criterionId, ipAddress: ip, score: newScore });
    } catch {
      // Concurrent insert — skip
      skipped.push(criterionId);
      continue;
    }

    // Upsert weighted average
    const [existing] = await db
      .select()
      .from(productRatingsTable)
      .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));

    if (existing) {
      const newCount = existing.count + 1;
      const newAvg = (parseFloat(String(existing.score)) * existing.count + newScore) / newCount;
      await db
        .update(productRatingsTable)
        .set({ score: String(newAvg.toFixed(2)), count: newCount })
        .where(and(eq(productRatingsTable.productId, id), eq(productRatingsTable.criterionId, criterionId)));
    } else {
      const [criterion] = await db.select({ id: criteriaTable.id }).from(criteriaTable).where(eq(criteriaTable.id, criterionId));
      if (!criterion) continue;
      await db.insert(productRatingsTable).values({
        productId: id, criterionId, score: String(newScore), count: 1,
      });
    }

    // Save comment if provided
    if (comments && typeof comments[criterionIdStr] === "string" && comments[criterionIdStr].trim()) {
      await db.insert(productRatingCommentsTable).values({
        productId: id, criterionId, comment: comments[criterionIdStr].trim(),
      });
    }
  }

  // Update review_count
  const allRatings = await db
    .select({ count: productRatingsTable.count })
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, id));
  const reviewCount = allRatings.reduce((a, b) => Math.max(a, b.count), 0);
  await db.update(productsTable).set({ reviewCount }).where(eq(productsTable.id, id));

  const accepted = Object.keys(scores).length - skipped.length;
  res.json({ ok: true, accepted, skipped });
});

export default router;
