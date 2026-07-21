import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { products } from '@/data/products';
import { getCriterionLabel } from '@/data/criteria';

// ---------- types ----------
type AmazonSpec = { label: string; value: string };
type AmazonResult =
  | { available: true; specs: AmazonSpec[]; features: string[] }
  | { available: false; reason: string };

// ---------- helpers ----------
function StarRating({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <span className="inline-flex items-center gap-2" aria-label={`5点満点中${score.toFixed(1)}点`}>
      <span className="text-amber-500" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (i < filled ? '★' : '☆')).join('')}
      </span>
      <span className="font-bold text-slate-700">{score.toFixed(1)}</span>
    </span>
  );
}

const RATINGS_LIMIT = 10;

// ---------- component ----------
export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const product = products.find((p) => p.id === productId);

  const [mainIndex, setMainIndex] = useState(0);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [amazonResult, setAmazonResult] = useState<AmazonResult | null>(null);

  useEffect(() => {
    if (!product?.asin) return;
    setAmazonLoading(true);
    fetch(`/api/amazon/${product.asin}`)
      .then((r) => r.json() as Promise<AmazonResult>)
      .then(setAmazonResult)
      .catch(() => setAmazonResult({ available: false, reason: 'fetch_error' }))
      .finally(() => setAmazonLoading(false));
  }, [product?.asin]);

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf1ed]">
        <div className="text-center">
          <p className="text-lg font-bold text-[#315c4c]">商品が見つかりません</p>
          <Link href="/explore" className="mt-4 inline-block text-sm text-[#315c4c] underline">
            探すに戻る
          </Link>
        </div>
      </main>
    );
  }

  // Image gallery
  const mainImage = product.images[mainIndex] ?? product.images[0];

  // Amazon link
  const affiliateTag = import.meta.env.VITE_AMAZON_AFFILIATE_TAG as string | undefined;
  const amazonUrl = product.asin
    ? affiliateTag
      ? `https://www.amazon.co.jp/dp/${product.asin}?tag=${affiliateTag}`
      : `https://www.amazon.co.jp/dp/${product.asin}`
    : null;

  // Overall score
  const ratingsArr = Object.values(product.ratings);
  const overallScore = ratingsArr.reduce((s, r) => s + r.score, 0) / ratingsArr.length;

  // Ratings list with 10-item limit
  const ratingEntries = Object.entries(product.ratings);
  const hasMore = ratingEntries.length > RATINGS_LIMIT;
  const visibleEntries = showAllRatings ? ratingEntries : ratingEntries.slice(0, RATINGS_LIMIT);

  // Amazon result helpers
  const amazonData = amazonResult?.available ? amazonResult : null;

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">

        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between px-5 pt-8">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm font-bold text-[#315c4c]"
          >
            ← 戻る
          </button>
          <Link
            href="/grow"
            className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            育てる →
          </Link>
        </div>

        {/* ── メイン画像 ── */}
        <div className="mt-5 px-5">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <img
              key={mainImage}
              src={mainImage}
              alt={`${product.name} メイン画像`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>

        {/* ── サブ画像 ── */}
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {product.images.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setMainIndex(index)}
                className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  index === mainIndex
                    ? 'border-[#315c4c]'
                    : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img src={url} alt={`サブ画像 ${index + 1}`} className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ── 商品情報 ── */}
        <div className="mt-6 px-5">
          <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#315c4c]">
              {product.brand}
            </p>
            <h1 className="mt-2 text-xl font-bold text-[#1f2a25]">{product.name}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400">型番: {product.modelNumber}</p>
            <p className="mt-4 text-2xl font-black text-[#1f2a25]">
              ¥{product.price.toLocaleString('ja-JP')}
            </p>
            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
              <StarRating score={overallScore} />
              <span className="text-sm text-slate-500">
                （{product.reviewCount.toLocaleString('ja-JP')}件）
              </span>
            </div>
          </div>
        </div>

        {/* ── この商品を評価する ── */}
        <div className="mt-4 px-5">
          <Link
            href={`/grow/rating?productId=${product.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#315c4c] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            <span aria-hidden="true">✎</span>
            <span>この商品を評価する</span>
          </Link>
        </div>

        {/* ── Amazon ボタン ── */}
        <div className="mt-3 px-5">
          {amazonUrl ? (
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF9900] px-5 py-4 font-bold text-white transition hover:bg-[#e68a00]"
            >
              <span>Amazon で見る</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-4 text-center">
              <p className="text-sm font-bold text-slate-400">Amazon ASIN 未登録</p>
              <p className="mt-1 text-xs text-slate-400">
                商品データに ASIN を設定するとリンクが有効になります
              </p>
            </div>
          )}
        </div>

        {/* ── Amazon 商品概要（サイズ・仕様） ── */}
        <div className="mt-4 px-5">
          <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">商品概要</h2>

            {/* 未設定 / ローディング / データあり */}
            {!product.asin ? (
              <p className="mt-3 text-xs text-slate-400">
                ASIN を登録すると Amazon から自動取得されます
              </p>
            ) : amazonLoading ? (
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : amazonData ? (
              <>
                {/* スペック表 */}
                {amazonData.specs.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {amazonData.specs.map((s) => (
                        <tr key={s.label}>
                          <td className="py-2 pr-3 font-medium text-slate-500 whitespace-nowrap">
                            {s.label}
                          </td>
                          <td className="py-2 text-slate-800">{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 商品特徴（箇条書き） */}
                {amazonData.features.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {amazonData.features.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 text-[#315c4c]" aria-hidden="true">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              /* 認証情報未設定など */
              <p className="mt-3 text-xs text-slate-400">
                Amazon PA API を設定すると、サイズ・重量・素材などの情報が表示されます
              </p>
            )}
          </div>
        </div>

        {/* ── 基準別評価 ── */}
        <div className="mt-4 px-5 pb-4">
          <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">基準別評価</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {visibleEntries.map(([id, rating]) => (
                <li key={id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm font-medium text-slate-700">
                    {getCriterionLabel(id)}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating score={rating.score} />
                    <span className="text-xs text-slate-400">({rating.count})</span>
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAllRatings((v) => !v)}
                className="mt-4 w-full rounded-xl border border-[#dce5df] py-2 text-xs font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]"
              >
                {showAllRatings
                  ? '折りたたむ'
                  : `さらに見る（残り ${ratingEntries.length - RATINGS_LIMIT} 件）`}
              </button>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
