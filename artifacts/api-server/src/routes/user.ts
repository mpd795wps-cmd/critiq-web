import { Router } from "express";
import { db, criterionSuggestionsTable, productSuggestionsTable, criteriaTable, categoriesTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { requireUser } from "../lib/userAuth";
import type { UserPayload } from "../lib/userAuth";

const router = Router();

// GET /user/my-submissions — logged-in user's criterion and product suggestions
router.get("/user/my-submissions", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).currentUser as UserPayload;

  // Fetch criterion suggestions by this user
  const criterionSuggestions = await db
    .select()
    .from(criterionSuggestionsTable)
    .where(eq(criterionSuggestionsTable.submitterUserId, user.userId))
    .orderBy(desc(criterionSuggestionsTable.createdAt));

  // For approved ones, fetch the resulting criterion's helpfulCount
  const resultingIds = criterionSuggestions
    .filter((s) => s.resultingCriterionId != null)
    .map((s) => s.resultingCriterionId as number);

  const criteriaMap = new Map<number, { helpfulCount: number }>();
  if (resultingIds.length > 0) {
    const criteria = await db
      .select({ id: criteriaTable.id, helpfulCount: criteriaTable.helpfulCount })
      .from(criteriaTable)
      .where(inArray(criteriaTable.id, resultingIds));
    for (const c of criteria) criteriaMap.set(c.id, { helpfulCount: c.helpfulCount });
  }

  // Fetch all referenced category names
  const allCategoryIds = [...new Set(criterionSuggestions.map((s) => s.categoryId))];
  const categories = allCategoryIds.length > 0
    ? await db.select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, allCategoryIds))
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Product suggestions
  const productSuggestions = await db
    .select()
    .from(productSuggestionsTable)
    .where(eq(productSuggestionsTable.submitterUserId, user.userId))
    .orderBy(desc(productSuggestionsTable.createdAt));

  res.json({
    criterionSuggestions: criterionSuggestions.map((s) => {
      const resulting = s.resultingCriterionId ? criteriaMap.get(s.resultingCriterionId) : null;
      return {
        id: s.id,
        categoryId: s.categoryId,
        categoryName: categoryMap.get(s.categoryId) ?? null,
        name: s.name,
        description: s.description,
        status: s.status,
        adminNotes: s.adminNotes,
        createdAt: s.createdAt.toISOString(),
        helpfulCount: resulting?.helpfulCount ?? null,
      };
    }),
    productSuggestions: productSuggestions.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      brand: s.brand,
      status: s.status,
      adminNotes: s.adminNotes,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

export default router;
