import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const id = parseInt(productId ?? '', 10);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.get(id),
    enabled: !isNaN(id),
    retry: false,
  });

  // Fetch criteria for the product's category to display criterion names
  const { data: criteria = [] } = useQuery({
    queryKey: ['criteria', product?.categoryId],
    queryFn: () => api.criteria.list(product!.categoryId),
    enabled: !!product,
  });

  const [mainIndex, setMainIndex] = useState(0);
  const [showAllRatings, setShowAllRatings] = useState(false);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf1ed]">
        <div className="animate-pulse text-[#315c4c]">読み込み中…</div>
      </main>
    );
  }

  if (error || !product) {
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

  const mainImage = product.images[mainIndex] ?? product.images[0];
  const overallScore =
    product.ratings.length > 0
      ? product.ratings.reduce((s, r) => s + r.score, 0) / product.ratings.length
      : 0;

  const hasMore = product.ratings.length > RATINGS_LIMIT;
  const visibleRatings = showAllRatings ? product.ratings : product.ratings.slice(0, RATINGS_LIMIT);

  function getCriterionName(criterionId: number): string {
    return criteria.find((c) => c.id === criterionId)?.name ?? `基準 ${criterionId}`;
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">

        <div className="flex items-center justify-between px-5 pt-8">
          <button type="button" onClick={() => window.history.back()} className="text-sm font-bold text-[#315c4c]">
            ← 戻る
          </button>
          <Link href="/grow" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">
            育てる →
          </Link>
        </div>

        <div className="mt-5 px-5">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <img key={mainImage} src={mainImage} alt={`${product.name} メイン画像`} className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>

        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {product.images.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setMainIndex(index)}
                className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  index === mainIndex ? 'border-[#315c4c]' : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img src={url} alt={`サブ画像 ${index + 1}`} className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 px-5">
          <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#315c4c]">{product.brand}</p>
            <h1 className="mt-2 text-xl font-bold text-[#1f2a25]">{product.name}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400">型番: {product.modelNumber}</p>
            {product.janCode && <p className="mt-0.5 font-mono text-xs text-slate-400">JAN: {product.janCode}</p>}
            <p className="mt-4 text-2xl font-black text-[#1f2a25]">¥{product.price.toLocaleString('ja-JP')}</p>
            {product.ratings.length > 0 && (
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <StarRating score={overallScore} />
                <span className="text-sm text-slate-500">（{product.reviewCount.toLocaleString('ja-JP')}件）</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 px-5">
          <Link
            href={`/grow/rating?productId=${product.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#315c4c] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            <span aria-hidden="true">✎</span>
            <span>この商品を評価する</span>
          </Link>
        </div>

        {product.ratings.length > 0 && (
          <div className="mt-4 px-5 pb-4">
            <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">基準別評価</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {visibleRatings.map((r) => (
                  <li key={r.criterionId} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{getCriterionName(r.criterionId)}</span>
                    <div className="flex items-center gap-2">
                      <StarRating score={r.score} />
                      <span className="text-xs text-slate-400">({r.count})</span>
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
                  {showAllRatings ? '折りたたむ' : `さらに見る（残り ${product.ratings.length - RATINGS_LIMIT} 件）`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
