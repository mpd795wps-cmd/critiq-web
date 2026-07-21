import { Router } from "express";
import { db, criterionSuggestionsTable, productSuggestionsTable, criteriaTable, categoriesTable } from "@workspace/db";
import { eq, desc, inArray, or, and } from "drizzle-orm";
import { requireUser } from "../lib/userAuth";
import type { UserPayload } from "../lib/userAuth";

const router = Router();

// GET /user/my-submissions — logged-in user's criterion and product suggestions
// Matches by userId (new data) OR email (recent new-schema data) OR username (legacy data)
router.get("/user/my-submissions", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).currentUser as UserPayload;

  // Criterion suggestions: match by userId OR email OR username (legacy)
  const criterionClauses = [eq(criterionSuggestionsTable.submitterUserId, user.userId)];
  if (user.email) criterionClauses.push(eq(criterionSuggestionsTable.submitterEmail, user.email));
  if (user.username) criterionClauses.push(eq(criterionSuggestionsTable.submitterUsername, user.username));
  const criterionWhere = criterionClauses.length === 1
    ? criterionClauses[0]
    : or(...criterionClauses)!;

  // Product suggestions: match by userId OR email (product suggestions never stored username)
  const productClauses = [eq(productSuggestionsTable.submitterUserId, user.userId)];
  if (user.email) productClauses.push(eq(productSuggestionsTable.submitterEmail, user.email));
  const productWhere = productClauses.length === 1
    ? productClauses[0]
    : or(...productClauses)!;

  const [criterionSuggestions, productSuggestions] = await Promise.all([
    db.select().from(criterionSuggestionsTable).where(criterionWhere).orderBy(desc(criterionSuggestionsTable.createdAt)),
    db.select().from(productSuggestionsTable).where(productWhere).orderBy(desc(productSuggestionsTable.createdAt)),
  ]);

  // For approved criterion suggestions, fetch helpfulCount of the resulting criterion
  const resultingIds = criterionSuggestions
    .filter((s) => s.resultingCriterionId != null)
    .map((s) => s.resultingCriterionId as number);

  const criteriaMap = new Map<number, number>(); // criterionId -> helpfulCount
  if (resultingIds.length > 0) {
    const criteria = await db
      .select({ id: criteriaTable.id, helpfulCount: criteriaTable.helpfulCount })
      .from(criteriaTable)
      .where(inArray(criteriaTable.id, resultingIds));
    for (const c of criteria) criteriaMap.set(c.id, c.helpfulCount);
  }

  // For approved suggestions without resultingCriterionId (old approvals), look up by name
  const needNameLookup = criterionSuggestions.filter(
    (s) => s.status === "approved" && !s.resultingCriterionId
  );
  const nameLookupMap = new Map<number, number>(); // suggestion.id -> helpfulCount
  for (const s of needNameLookup) {
    const [match] = await db
      .select({ helpfulCount: criteriaTable.helpfulCount })
      .from(criteriaTable)
      .where(and(eq(criteriaTable.name, s.name), eq(criteriaTable.categoryId, s.categoryId)))
      .limit(1);
    if (match) nameLookupMap.set(s.id, match.helpfulCount);
  }

  // Fetch category names
  const allCategoryIds = [...new Set(criterionSuggestions.map((s) => s.categoryId))];
  const categories = allCategoryIds.length > 0
    ? await db.select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable).where(inArray(categoriesTable.id, allCategoryIds))
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  res.json({
    criterionSuggestions: criterionSuggestions.map((s) => {
      let helpfulCount: number | null = null;
      if (s.resultingCriterionId) {
        helpfulCount = criteriaMap.get(s.resultingCriterionId) ?? null;
      } else if (s.status === "approved") {
        helpfulCount = nameLookupMap.get(s.id) ?? null;
      }
      return {
        id: s.id,
        categoryId: s.categoryId,
        categoryName: categoryMap.get(s.categoryId) ?? null,
        name: s.name,
        description: s.description,
        status: s.status,
        adminNotes: s.adminNotes,
        createdAt: s.createdAt.toISOString(),
        helpfulCount,
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
