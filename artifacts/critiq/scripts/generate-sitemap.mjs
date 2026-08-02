import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const publicDir = path.resolve(appDir, "public");

const siteUrl = (
  process.env.CRITIQ_SITE_URL ??
  "https://critiq-web-critiq.vercel.app"
).replace(/\/$/, "");

const apiUrl = (
  process.env.CRITIQ_API_URL ??
  "https://critiq-web-api-server.vercel.app/api"
).replace(/\/$/, "");

const today = new Date().toISOString().slice(0, 10);

const urls = new Map();

function addUrl(pathname, options = {}) {
  const normalizedPath =
    pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;

  urls.set(`${siteUrl}${normalizedPath}`, {
    lastmod: options.lastmod ?? today,
    changefreq: options.changefreq,
    priority: options.priority,
  });
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// 検索結果に載せたい固定ページ
addUrl("/", { changefreq: "weekly", priority: "1.0" });
addUrl("/explore", { changefreq: "daily", priority: "0.9" });
addUrl("/grow", { changefreq: "weekly", priority: "0.7" });
addUrl("/grow/rating", { changefreq: "daily", priority: "0.7" });
addUrl("/grow/product", { changefreq: "monthly", priority: "0.5" });
addUrl("/grow/criterion", { changefreq: "monthly", priority: "0.5" });

try {
  const categoriesResponse = await fetch(`${apiUrl}/categories`);

  if (!categoriesResponse.ok) {
    throw new Error(
      `カテゴリ取得失敗: ${categoriesResponse.status}`,
    );
  }

  const categories = await categoriesResponse.json();

  for (const category of categories) {
    if (!category?.id || !category?.slug) {
      continue;
    }

    addUrl(`/explore/${category.slug}`, {
      changefreq: "weekly",
      priority: "0.8",
    });

    const productsResponse = await fetch(
      `${apiUrl}/categories/${category.id}/products`,
    );

    if (!productsResponse.ok) {
      console.warn(
        `商品取得をスキップ: category=${category.id}, status=${productsResponse.status}`,
      );
      continue;
    }

    const products = await productsResponse.json();

    for (const product of products) {
      if (!product?.id) {
        continue;
      }

      // 検索結果に載せる代表URLは商品詳細ページ
      addUrl(`/product/${product.id}`, {
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  }
} catch (error) {
  // APIに一時的に接続できなくても、固定ページだけでビルドを継続
  console.warn(
    "動的URLを取得できなかったため、固定ページのみでサイトマップを生成します。",
    error,
  );
}

const xmlEntries = [...urls.entries()]
  .map(([loc, metadata]) => {
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${metadata.lastmod}</lastmod>`,
    ];

    if (metadata.changefreq) {
      lines.push(
        `    <changefreq>${metadata.changefreq}</changefreq>`,
      );
    }

    if (metadata.priority) {
      lines.push(
        `    <priority>${metadata.priority}</priority>`,
      );
    }

    lines.push("  </url>");

    return lines.join("\n");
  })
  .join("\n");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  xmlEntries,
  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /admin/",
  "Disallow: /login",
  "Disallow: /register",
  "",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

await mkdir(publicDir, { recursive: true });
await writeFile(
  path.join(publicDir, "sitemap.xml"),
  sitemap,
  "utf8",
);
await writeFile(
  path.join(publicDir, "robots.txt"),
  robots,
  "utf8",
);

console.log(`sitemap.xmlを生成しました: ${urls.size} URLs`);
console.log(`公開URL: ${siteUrl}/sitemap.xml`);
