import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

const COOKIE_NAME = "critiq_admin";
const TOKEN_TTL = "7d";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function signAdminToken(): string {
  return jwt.sign({ role: "admin" }, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, getSecret()) as { role?: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function setAdminCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export { COOKIE_NAME };
