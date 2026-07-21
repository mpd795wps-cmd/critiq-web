import { Router } from "express";

const router = Router();

function extractMeta(html: string, property: string): string {
  // og: property
  const ogMatch = html.match(
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  ) ?? html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i")
  );
  if (ogMatch) return ogMatch[1].trim();
  // name=
  const nameMatch = html.match(
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  ) ?? html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i")
  );
  return nameMatch ? nameMatch[1].trim() : "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "";
}

function extractPrice(html: string): number | null {
  // Look for common price patterns in Japanese pages
  const patterns = [
    /[￥¥][\s]?([\d,]+)/,
    /([\d,]+)\s*円/,
    /"price":\s*"?([\d.]+)"?/,
    /itemPrice[^>]*>([\d,]+)/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(n) && n > 100 && n < 10_000_000) return n;
    }
  }
  return null;
}

function extractImages(html: string, baseUrl: string): string[] {
  const imgs: string[] = [];

  // og:image first
  const ogImg = extractMeta(html, "og:image");
  if (ogImg) imgs.push(ogImg.startsWith("//") ? "https:" + ogImg : ogImg);

  // twitter:image
  const twImg = extractMeta(html, "twitter:image");
  if (twImg && !imgs.includes(twImg)) {
    imgs.push(twImg.startsWith("//") ? "https:" + twImg : twImg);
  }

  return imgs.filter((u) => u.startsWith("http"));
}

// Guess brand from og:site_name or domain
function guessBrand(html: string, url: string): string {
  const siteName = extractMeta(html, "og:site_name");
  if (siteName) return siteName;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return "";
  }
}

// POST /products/fetch-url
router.post("/products/fetch-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url は必須です" }); return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("bad protocol");
  } catch {
    res.status(400).json({ error: "有効なURLを入力してください" }); return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CritiqBot/1.0)",
        "Accept-Language": "ja,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.status(422).json({ error: `ページの取得に失敗しました (${response.status})` }); return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      res.status(422).json({ error: "HTMLページではありません" }); return;
    }

    // Read up to 500KB to avoid huge pages
    const buffer = await response.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buffer.slice(0, 500_000));

    const ogTitle = extractMeta(html, "og:title");
    const ogDesc = extractMeta(html, "og:description");
    const metaDesc = extractMeta(html, "description");
    const title = ogTitle || extractTitle(html);
    const description = ogDesc || metaDesc;
    const images = extractImages(html, url);
    const price = extractPrice(html);
    const brand = guessBrand(html, url);

    res.json({
      name: title,
      brand,
      description,
      images,
      price,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.includes("abort")) {
      res.status(422).json({ error: "ページの読み込みがタイムアウトしました" }); return;
    }
    res.status(422).json({ error: "ページの取得に失敗しました" });
  }
});

export default router;
