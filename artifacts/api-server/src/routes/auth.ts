import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { setUserCookie, clearUserCookie, verifyUserToken } from "../lib/userAuth.js";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, username } = req.body as { email?: string; username?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "有効なメールアドレスを入力してください" }); return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "このメールアドレスはすでに登録されています" }); return;
  }

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    username: username?.trim() || null,
  }).returning();

  setUserCookie(res, { userId: user.id, email: user.email, username: user.username });
  res.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "メールアドレスを入力してください" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) { res.status(404).json({ error: "このメールアドレスは登録されていません" }); return; }

  setUserCookie(res, { userId: user.id, email: user.email, username: user.username });
  res.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res): void => {
  clearUserCookie(res);
  res.json({ ok: true });
});

// GET /auth/me
router.get("/auth/me", (req, res): void => {
  const token = req.cookies?.critiq_user;
  if (!token) { res.status(401).json({ error: "未ログイン" }); return; }
  const payload = verifyUserToken(token);
  if (!payload) { res.status(401).json({ error: "セッション無効" }); return; }
  res.json({ ok: true, user: { id: payload.userId, email: payload.email, username: payload.username } });
});

export default router;
