import { Router } from 'express';

const router = Router();

/**
 * GET /api/jan/:code
 * JAN/EAN-13 コードで商品情報を検索する。
 * 優先順位:
 *   1. upcitemdb (国際 UPC / EAN データ)
 *   2. Open Food Facts (食品)
 *   3. 見つからなければ found:false を返す
 */
router.get('/jan/:code', async (req, res) => {
  const { code } = req.params;

  if (!code || !/^\d{8,14}$/.test(code)) {
    return res.status(400).json({ found: false, reason: 'invalid_code' });
  }

  // ── 1. upcitemdb ──────────────────────────────────────────
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'CRITIQ/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = (await r.json()) as Record<string, unknown>;
      const item = ((data as any).items as any[])?.[0];
      if (item) {
        return res.json({
          found: true,
          name: item.title ?? '',
          brand: item.brand ?? '',
          description: item.description ?? '',
          images: ((item.images ?? []) as string[]).slice(0, 6),
          lowestPrice: item.lowest_recorded_price ?? null,
        });
      }
    }
  } catch {
    // fall through to next source
  }

  // ── 2. Open Food Facts (EAN-13 食品のみだが試みる) ────────
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'CRITIQ/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = (await r.json()) as Record<string, unknown>;
      if ((data as any).status === 1) {
        const p = (data as any).product as Record<string, unknown>;
        return res.json({
          found: true,
          name: (p.product_name_ja ?? p.product_name ?? '') as string,
          brand: (p.brands ?? '') as string,
          description: (p.generic_name ?? '') as string,
          images: p.image_url ? [p.image_url as string] : [],
          lowestPrice: null,
        });
      }
    }
  } catch {
    // fall through
  }

  return res.json({ found: false, reason: 'not_found' });
});

export default router;
