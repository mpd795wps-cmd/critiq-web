import { Router } from 'express';

const router = Router();

/**
 * GET /api/jan/:code
 * JANコード（EAN-13）で商品情報を検索する。
 * upcitemdb.com の無料 trial API を使用（100回/日）。
 */
router.get('/jan/:code', async (req, res) => {
  const { code } = req.params;

  if (!code || !/^\d{8,14}$/.test(code)) {
    return res.status(400).json({ found: false, reason: 'invalid_code' });
  }

  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'CRITIQ/1.0' },
    });

    if (!response.ok) {
      return res.json({ found: false, reason: 'api_error', status: response.status });
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = (data as any).items as unknown[] | undefined;
    const item = items?.[0] as any;

    if (!item) {
      return res.json({ found: false, reason: 'not_found' });
    }

    return res.json({
      found: true,
      name: item.title ?? '',
      brand: item.brand ?? '',
      description: item.description ?? '',
      images: (item.images ?? []).slice(0, 6) as string[],
      lowestPrice: item.lowest_recorded_price ?? null,
      highestPrice: item.highest_recorded_price ?? null,
      category: item.category ?? '',
    });
  } catch {
    return res.status(500).json({ found: false, reason: 'internal_error' });
  }
});

export default router;
