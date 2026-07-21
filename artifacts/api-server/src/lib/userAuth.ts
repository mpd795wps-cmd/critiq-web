import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.SESSION_SECRET ?? "critiq-user-secret";
const COOKIE = "critiq_user";

export type UserPayload = { userId: number; email: string; username: string | null };

export function signUserToken(payload: UserPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "90d" });
}

export function verifyUserToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export function setUserCookie(res: Response, payload: UserPayload): void {
  const token = signUserToken(payload);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 90 * 24 * 60 * 60 * 1000,
  });
}

export function clearUserCookie(res: Response): void {
  res.clearCookie(COOKIE);
}

/** Middleware: requires valid user cookie. Attaches req.currentUser. */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE];
  if (!token) { res.status(401).json({ error: "ログインが必要です" }); return; }
  const payload = verifyUserToken(token);
  if (!payload) { res.status(401).json({ error: "セッションが無効です" }); return; }
  (req as any).currentUser = payload;
  next();
}

/** Middleware: attaches req.currentUser if cookie present, but never rejects. */
export function optionalUser(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE];
  if (token) {
    const payload = verifyUserToken(token);
    if (payload) (req as any).currentUser = payload;
  }
  next();
}
