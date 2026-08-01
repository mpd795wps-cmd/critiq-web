import { Router } from "express";

const router = Router();

type FetchResponse = {
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  arrayBuffer(): Promise<ArrayBuffer>;
};

function extractMeta(html: string, property: string): string {
  const ogMatch =
    html.match(
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
        "i",
      ),
    );

  if (ogMatch) {
    return ogMatch[1].trim();
  }

  const nameMatch =
    html.match(
      new RegExp(
        `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
        "i",
      ),
    );

  return nameMatch ? nameMatch[1].trim() : "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractPrice(html: string): number | null {
  const patterns = [
    /[￥¥][\s]?([\d,]+)/,
    /([\d,]+)\s*円/,
    /"price":\s*"?([\d.]+)"?/,
    /itemPrice[^>]*>([\d,]+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) {
      const value = Number.parseInt(match[1].replace(/,/g, ""), 10);

      if (!Number.isNaN(value) && value > 100 && value < 10_000_000) {
        return value;
      }
    }
  }

  return null;
}

function extractImages(html: string): string[] {
  const images: string[] = [];

  const ogImage = extractMeta(html, "og:image");

  if (ogImage) {
    images.push(ogImage.startsWith("//") ? `https:${ogImage}` : ogImage);
  }

  const twitterImage = extractMeta(html, "twitter:image");

  if (twitterImage && !images.includes(twitterImage)) {
    images.push(
      twitterImage.startsWith("//")
        ? `https:${twitterImage}`
        : twitterImage,
    );
  }

  return images.filter((imageUrl) => imageUrl.startsWith("http"));
}

function guessBrand(html: string, url: string): string {
  const siteName = extractMeta(html, "og:site_name");

  if (siteName) {
    return siteName;
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

router.post("/products/fetch-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url は必須です" });
    return;
  }

  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("bad protocol");
    }
  } catch {
    res.status(400).json({ error: "有効なURLを入力してください" });
    return;
  }

  try {
    const response = (await globalThis.fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CritiqBot/1.0)",
        "Accept-Language": "ja,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    })) as FetchResponse;

    if (!response.ok) {
      res.status(422).json({
        error: `ページの取得に失敗しました（サイト側エラー: ${response.status}）`,
      });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      res.status(422).json({ error: "HTMLページではありません" });
      return;
    }

    const buffer = await response.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(
      buffer.slice(0, 500_000),
    );

    const title =
      extractMeta(html, "og:title") || extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "description");

    res.json({
      name: title,
      brand: guessBrand(html, url),
      description,
      images: extractImages(html),
      price: extractPrice(html),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    if (message.includes("timeout") || message.includes("abort")) {
      res.status(422).json({
        error: "ページの読み込みがタイムアウトしました",
      });
      return;
    }

    res.status(422).json({
      error: "ページの取得に失敗しました",
    });
  }
});

export default router;
