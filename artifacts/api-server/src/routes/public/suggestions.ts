import { Router } from "express";
import { db, criterionSuggestionsTable, productSuggestionsTable, categorySuggestionsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireUser, optionalUser } from "../../lib/userAuth";
import type { UserPayload } from "../../lib/userAuth";

const router = Router();

// POST /criterion-suggestions — optional auth, stores submitter info if logged in
router.post("/criterion-suggestions", optionalUser, async (req, res): Promise<void> => {
  const { categoryId, name, description, reason, submitterUsername } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "categoryId, name, description は必須です" }); return;
  }
  const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) { res.status(400).json({ error: "カテゴリが存在しません" }); return; }

  const user = (req as any).currentUser as UserPayload | undefined;

  await db.insert(criterionSuggestionsTable).values({
    categoryId,
    name: name.trim(),
    description: description.trim(),
    reason: typeof reason === "string" ? reason.trim() || null : null,
    submitterUsername: user?.username ?? (typeof submitterUsername === "string" && submitterUsername.trim() ? submitterUsername.trim() : null),
    submitterUserId: user?.userId ?? null,
    submitterEmail: user?.email ?? null,
  });
  res.status(201).json({ ok: true });
});

// POST /product-suggestions — optional auth
router.post("/product-suggestions", optionalUser, async (req, res): Promise<void> => {
  const { categoryId, brand, name, modelNumber, janCode, price, description, images, pendingRatings } = req.body as Record<string, unknown>;
  if (typeof categoryId !== "number" || typeof brand !== "string" || !brand.trim() || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "categoryId, brand, name は必須です" }); return;
  }
  const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) { res.status(400).json({ error: "カテゴリが存在しません" }); return; }

  const user = (req as any).currentUser as UserPayload | undefined;

  // Serialize pendingRatings as JSON string if valid object
  let pendingRatingsStr: string | null = null;
  if (pendingRatings && typeof pendingRatings === "object" && !Array.isArray(pendingRatings)) {
    const valid = Object.entries(pendingRatings as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number" && (v as number) >= 1 && (v as number) <= 5);
    if (valid.length > 0) pendingRatingsStr = JSON.stringify(Object.fromEntries(valid));
  }

  await db.insert(productSuggestionsTable).values({
    categoryId,
    brand: brand.trim(),
    name: (name as string).trim(),
    modelNumber: typeof modelNumber === "string" ? modelNumber.trim() : "",
    janCode: typeof janCode === "string" && janCode.trim() ? janCode.trim() : null,
    price: typeof price === "number" ? price : null,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    images: Array.isArray(images) ? images.filter((u): u is string => typeof u === "string") : [],
    submitterUserId: user?.userId ?? null,
    submitterEmail: user?.email ?? null,
    pendingRatings: pendingRatingsStr,
  });
  res.status(201).json({ ok: true });
});

// POST /category-suggestions — requires login
router.post("/category-suggestions", requireUser, async (req, res): Promise<void> => {
  const { name, description } = req.body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "カテゴリ名は必須です" }); return;
  }
  const user = (req as any).currentUser as UserPayload;
  await db.insert(categorySuggestionsTable).values({
    name: name.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    submitterUserId: user.userId,
    submitterEmail: user.email,
  });
  res.status(201).json({ ok: true });
});

export default router;
