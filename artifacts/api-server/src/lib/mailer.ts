import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const from = process.env.FROM_EMAIL ?? process.env.SMTP_USER ?? "noreply@critiq.app";
  const transport = createTransport();

  if (!transport) {
    // SMTP not configured — log to console
    logger.info({ to: opts.to, subject: opts.subject }, `[MAIL] ${opts.text}`);
    return;
  }

  try {
    await transport.sendMail({ from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, "Mail sent");
  } catch (err) {
    logger.error({ err }, "Failed to send mail");
  }
}

// ── Template helpers ──────────────────────────────────────────

export function criterionApprovedMail(opts: {
  to: string;
  criterionName: string;
  categoryName: string;
}): Parameters<typeof sendMail>[0] {
  return {
    to: opts.to,
    subject: `【CRITIQ】基準「${opts.criterionName}」が承認されました`,
    text: `ご提案いただいた基準「${opts.criterionName}」（カテゴリ: ${opts.categoryName}）が承認され、CRITIQに追加されました。ありがとうございます！`,
    html: `<p>ご提案いただいた基準「<strong>${opts.criterionName}</strong>」（カテゴリ: ${opts.categoryName}）が承認され、CRITIQに追加されました。ありがとうございます！</p>`,
  };
}

export function criterionRejectedMail(opts: {
  to: string;
  criterionName: string;
  adminNotes?: string | null;
}): Parameters<typeof sendMail>[0] {
  const noteText = opts.adminNotes ? `\n\n運営からのコメント: ${opts.adminNotes}` : "";
  return {
    to: opts.to,
    subject: `【CRITIQ】基準「${opts.criterionName}」の審査結果`,
    text: `ご提案いただいた基準「${opts.criterionName}」は今回は見送りとなりました。またのご提案をお待ちしております。${noteText}`,
    html: `<p>ご提案いただいた基準「<strong>${opts.criterionName}</strong>」は今回は見送りとなりました。またのご提案をお待ちしております。${opts.adminNotes ? `<br><br>運営からのコメント: ${opts.adminNotes}` : ""}</p>`,
  };
}

export function productApprovedMail(opts: {
  to: string;
  productName: string;
}): Parameters<typeof sendMail>[0] {
  return {
    to: opts.to,
    subject: `【CRITIQ】商品「${opts.productName}」が承認されました`,
    text: `ご登録申請いただいた商品「${opts.productName}」が承認され、CRITIQに追加されました。ありがとうございます！`,
    html: `<p>ご登録申請いただいた商品「<strong>${opts.productName}</strong>」が承認され、CRITIQに追加されました。ありがとうございます！</p>`,
  };
}

export function productRejectedMail(opts: {
  to: string;
  productName: string;
  adminNotes?: string | null;
}): Parameters<typeof sendMail>[0] {
  const noteText = opts.adminNotes ? `\n\n運営からのコメント: ${opts.adminNotes}` : "";
  return {
    to: opts.to,
    subject: `【CRITIQ】商品「${opts.productName}」の審査結果`,
    text: `ご登録申請いただいた商品「${opts.productName}」は今回は見送りとなりました。またのご提案をお待ちしております。${noteText}`,
    html: `<p>ご登録申請いただいた商品「<strong>${opts.productName}</strong>」は今回は見送りとなりました。またのご提案をお待ちしております。${opts.adminNotes ? `<br><br>運営からのコメント: ${opts.adminNotes}` : ""}</p>`,
  };
}

export function categoryApprovedMail(opts: {
  to: string;
  categoryName: string;
}): Parameters<typeof sendMail>[0] {
  return {
    to: opts.to,
    subject: `【CRITIQ】カテゴリ「${opts.categoryName}」が承認されました`,
    text: `ご提案いただいたカテゴリ「${opts.categoryName}」が承認されました。ありがとうございます！`,
    html: `<p>ご提案いただいたカテゴリ「<strong>${opts.categoryName}</strong>」が承認されました。ありがとうございます！</p>`,
  };
}

export function categoryRejectedMail(opts: {
  to: string;
  categoryName: string;
  adminNotes?: string | null;
}): Parameters<typeof sendMail>[0] {
  const noteText = opts.adminNotes ? `\n\n運営からのコメント: ${opts.adminNotes}` : "";
  return {
    to: opts.to,
    subject: `【CRITIQ】カテゴリ「${opts.categoryName}」の審査結果`,
    text: `ご提案いただいたカテゴリ「${opts.categoryName}」は今回は見送りとなりました。またのご提案をお待ちしております。${noteText}`,
    html: `<p>ご提案いただいたカテゴリ「<strong>${opts.categoryName}</strong>」は今回は見送りとなりました。またのご提案をお待ちしております。${opts.adminNotes ? `<br><br>運営からのコメント: ${opts.adminNotes}` : ""}</p>`,
  };
}
