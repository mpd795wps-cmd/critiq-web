import { Router } from "express";
import { signAdminToken, setAdminCookie, clearAdminCookie, requireAdmin, COOKIE_NAME } from "../../lib/adminAuth.js";

const router = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) { res.status(500).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  if (!password || password !== expected) {
    res.status(401).json({ error: "Invalid password" }); return;
  }
  const token = signAdminToken();
  setAdminCookie(res, token);
  res.json({ ok: true });
});

router.post("/admin/logout", (_req, res): void => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get("/admin/me", requireAdmin, (_req, res): void => {
  res.json({ ok: true });
});

export default router;
