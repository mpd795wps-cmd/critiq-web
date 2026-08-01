import { Router } from "express";

const router = Router();

type FetchResponse = {
  ok: boolean;
  json(): Promise<unknown>;
};

<<<<<<< HEAD
/**
 * GET /api/jan/:code
 * JAN/EAN-13コードで商品情報を検索する。
=======
type UpcItem = {
  title?: string;
  brand?: string;
  description?: string;
  images?: string[];
  lowest_recorded_price?: number | null;
};

type UpcResponse = {
  items?: UpcItem[];
};

type FoodProduct = {
  product_name_ja?: string;
  product_name?: string;
  brands?: string;
  generic_name?: string;
  image_url?: string;
};

type FoodResponse = {
  status?: number;
  product?: FoodProduct;
};

/**
 * GET /api/jan/:code
 * JAN/EANコードから商品情報を検索する。
>>>>>>> fix/vercel-neon-integration
 */
router.get("/jan/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || !/^\d{8,14}$/.test(code)) {
    return res.status(400).json({
      found: false,
      reason: "invalid_code",
    });
  }

<<<<<<< HEAD
  // 1. UPCitemdb
=======
>>>>>>> fix/vercel-neon-integration
  try {
    const response = (await globalThis.fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "CRITIQ/1.0",
        },
        signal: AbortSignal.timeout(5000),
      },
    )) as FetchResponse;

    if (response.ok) {
<<<<<<< HEAD
      const data = (await response.json()) as {
        items?: Array<{
          title?: string;
          brand?: string;
          description?: string;
          images?: string[];
          lowest_recorded_price?: number | null;
        }>;
      };

=======
      const data = (await response.json()) as UpcResponse;
>>>>>>> fix/vercel-neon-integration
      const item = data.items?.[0];

      if (item) {
        return res.json({
          found: true,
          name: item.title ?? "",
          brand: item.brand ?? "",
          description: item.description ?? "",
          images: (item.images ?? []).slice(0, 6),
          lowestPrice: item.lowest_recorded_price ?? null,
        });
      }
    }
  } catch {
<<<<<<< HEAD
    // 次の検索先へ進む
  }

  // 2. Open Food Facts
=======
    // 次の取得先へ進む
  }

>>>>>>> fix/vercel-neon-integration
  try {
    const response = (await globalThis.fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "CRITIQ/1.0",
        },
        signal: AbortSignal.timeout(5000),
      },
    )) as FetchResponse;

    if (response.ok) {
<<<<<<< HEAD
      const data = (await response.json()) as {
        status?: number;
        product?: {
          product_name_ja?: string;
          product_name?: string;
          brands?: string;
          generic_name?: string;
          image_url?: string;
        };
      };
=======
      const data = (await response.json()) as FoodResponse;
>>>>>>> fix/vercel-neon-integration

      if (data.status === 1 && data.product) {
        const product = data.product;

        return res.json({
          found: true,
<<<<<<< HEAD
          name: product.product_name_ja ?? product.product_name ?? "",
=======
          name:
            product.product_name_ja ??
            product.product_name ??
            "",
>>>>>>> fix/vercel-neon-integration
          brand: product.brands ?? "",
          description: product.generic_name ?? "",
          images: product.image_url ? [product.image_url] : [],
          lowestPrice: null,
        });
      }
    }
  } catch {
    // 見つからない場合の応答へ進む
  }

  return res.json({
    found: false,
    reason: "not_found",
  });
});

export default router;
