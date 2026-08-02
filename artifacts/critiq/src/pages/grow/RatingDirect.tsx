import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { ApiCriterion, ApiProduct } from '@/types/api';

// ── Star input ────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className="text-4xl leading-none transition-transform active:scale-90" aria-label={`${star}点`}>
          <span className={star <= display ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Rating form ───────────────────────────────────────────
function RatingForm({
  product,
  criteria,
  onDone,
}: {
  product: ApiProduct;
  criteria: ApiCriterion[];
  onDone: () => void | Promise<void>;
}) {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: myRatingData } = useQuery({
    queryKey: ['my-rating', product.id],
    queryFn: () => api.products.myRating(product.id),
  });

  useEffect(() => {
    if (myRatingData && !initialized) {
      const prev: Record<number, number> = {};
      for (const [k, v] of Object.entries(myRatingData.ratings)) {
        prev[parseInt(k, 10)] = v;
      }
      if (Object.keys(prev).length > 0) setScores(prev);
      setInitialized(true);
    }
  }, [myRatingData, initialized]);

  const hasPrevRatings = Object.keys(myRatingData?.ratings ?? {}).length > 0;
  const ratedCount = Object.values(scores).filter((v) => v > 0).length;

  async function handleSubmit() {
    if (ratedCount === 0) { setError('少なくとも1つの基準を評価してください。'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.products.submitRating(product.id, scores, comments);
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (criteria.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
        評価基準を読み込み中…
      </div>
    );
  }

  return (
    <div>
      {hasPrevRatings && (
        <p className="mb-4 rounded-xl bg-[#e8f0eb] px-4 py-3 text-sm text-[#315c4c]">
          ✏️ 前回の評価が入力されています。変更して再送信できます。
        </p>
      )}
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 0;
          const prevScore = myRatingData?.ratings[String(criterion.id)];
          const comment = comments[criterion.id] ?? '';
          return (
            <div key={criterion.id}
              className={`rounded-2xl border bg-white p-4 transition ${score > 0 ? 'border-[#4d7c67]' : 'border-[#dce5df]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1f2a25]">{criterion.name}</p>
                  {criterion.description && (
                    <p className="mt-0.5 text-xs leading-5 text-[#68746e]">{criterion.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {score > 0 && <span className="text-xs font-bold text-[#315c4c]">{score}.0</span>}
                  {prevScore != null && prevScore !== score && (
                    <span className="text-[10px] text-slate-400">前回 {prevScore}.0</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StarInput value={score} onChange={(n) => setScores((prev) => ({ ...prev, [criterion.id]: n }))} />
                {score === 0 && <span className="text-xs text-slate-400">タップして評価</span>}
              </div>
              {score > 0 && (
                <textarea
                  value={comment}
                  onChange={(e) => setComments((prev) => ({ ...prev, [criterion.id]: e.target.value }))}
                  placeholder="コメントを入力（任意）"
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl border border-[#dce5df] bg-[#f8faf8] px-3 py-2 text-sm outline-none transition focus:border-[#315c4c] placeholder:text-slate-300"
                />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={ratedCount === 0 || submitting}
        className="mt-5 w-full rounded-2xl bg-[#315c4c] px-4 py-4 font-bold text-white transition hover:bg-[#284b3f] disabled:cursor-not-allowed disabled:bg-slate-300">
        {submitting ? '送信中…' : ratedCount === 0 ? '評価を入力してください' : hasPrevRatings ? `${ratedCount}件の評価を更新する` : `${ratedCount}件の評価を送信する`}
      </button>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────
function ResultStars({ score }: { score: number }) {
  const rounded = Math.round(score);

  return (
    <span
      className="inline-flex items-center gap-2"
      aria-label={`5点満点中${score.toFixed(1)}点`}
    >
      <span className="text-amber-400" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) =>
          index < rounded ? '★' : '☆',
        ).join('')}
      </span>
      <span className="font-bold text-[#1f2a25]">
        {score.toFixed(1)}
      </span>
    </span>
  );
}

function SuccessScreen({
  product,
  criteria,
}: {
  product: ApiProduct;
  criteria: ApiCriterion[];
}) {
  const overallScore =
    product.ratings.length > 0
      ? product.ratings.reduce((total, rating) => total + rating.score, 0) /
        product.ratings.length
      : 0;

  const ratingUrl =
    typeof window === 'undefined'
      ? `/grow/rating/${product.id}`
      : `${window.location.origin}/grow/rating/${product.id}`;

  function getCriterionName(criterionId: number): string {
    return (
      criteria.find((criterion) => criterion.id === criterionId)?.name ??
      `基準 ${criterionId}`
    );
  }

  async function handleShare() {
    const shareData = {
      title: `${product.name}を評価する｜CRITIQ`,
      text: `${product.brand} ${product.name}を使ったことがある方、評価をお願いします。`,
      url: ratingUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(ratingUrl);
      window.alert('評価ページのURLをコピーしました');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      window.alert('共有に失敗しました');
    }
  }

  return (
    <div className="pb-8 text-center">
      <div className="flex flex-col items-center py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f0eb] text-4xl text-[#315c4c]">
          ✓
        </div>

        <h2 className="mt-5 text-xl font-bold text-[#1f2a25]">
          評価を送信しました！
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#68746e]">
          ありがとうございます。
          <br />
          あなたの評価を反映した最新結果です。
        </p>
      </div>

      <section className="rounded-2xl border border-[#dce5df] bg-white p-5 text-left">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#315c4c]">
              現在の商品評価
            </p>
            <p className="mt-1 text-sm text-[#68746e]">
              {product.reviewCount.toLocaleString('ja-JP')}件の評価
            </p>
          </div>

          {product.ratings.length > 0 && (
            <ResultStars score={overallScore} />
          )}
        </div>

        {product.ratings.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#f8faf8] px-4 py-4 text-center text-sm text-slate-400">
            評価結果を更新しています。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {[...product.ratings]
              .sort((a, b) => b.score - a.score)
              .map((rating) => (
                <li
                  key={rating.criterionId}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1f2a25]">
                      {getCriterionName(rating.criterionId)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {rating.count.toLocaleString('ja-JP')}件
                    </p>
                  </div>

                  <ResultStars score={rating.score} />
                </li>
              ))}
          </ul>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-2xl bg-[#315c4c] px-5 py-4 font-bold text-white transition hover:bg-[#284b3f]"
        >
          この商品を評価してもらう
        </button>

        <Link
          href={`/product/${product.id}`}
          className="block w-full rounded-2xl border-2 border-[#315c4c] px-5 py-4 text-center font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
        >
          商品詳細を見る
        </Link>

        <Link
          href="/grow/rating"
          className="block w-full rounded-2xl border border-[#dce5df] px-5 py-4 text-center text-sm font-semibold text-[#68746e] transition hover:bg-[#f1f6f3]"
        >
          他の商品を評価する
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function RatingDirect() {
  const params = useParams<{ productId: string }>();
  const productId = parseInt(params.productId ?? '', 10);
  const [done, setDone] = useState(false);

  const {
    data: product,
    isLoading: productLoading,
    isError,
    refetch: refetchProduct,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.products.get(productId),
    enabled: !isNaN(productId),
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ['criteria', product?.categoryId],
    queryFn: () => api.criteria.list(product!.categoryId),
    enabled: !!product?.categoryId,
  });

  usePageMeta(
    product ? `${product.name}を評価する｜CRITIQ` : '商品を評価する｜CRITIQ',
    product
      ? `${product.brand} ${product.name}をあなたの基準で評価しましょう。CRITIQ — アウトドア用品比較サービス。`
      : 'アウトドア用品をあなたの基準で評価しましょう。',
  );

  if (isNaN(productId) || isError) {
    return (
      <main className="min-h-screen bg-[#edf1ed]">
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] px-5 pb-24 pt-8">
          <Link href="/grow/rating" className="text-sm font-bold text-[#315c4c]">← 評価ページへ戻る</Link>
          <p className="mt-8 text-center text-sm text-slate-400">商品が見つかりませんでした。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">

        {/* Header nav */}
        <div className="flex items-center justify-between px-5 pb-2 pt-8">
          <Link href={product ? `/product/${product.id}` : '/grow/rating'} className="text-sm font-bold text-[#315c4c]">
            ← {product ? '商品詳細' : '戻る'}
          </Link>
          <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">
            探す →
          </Link>
        </div>

        {/* Product header */}
        {productLoading ? (
          <div className="mt-4 px-5">
            <div className="h-6 w-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-2 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
          </div>
        ) : product && (
          <>
            {/* Hero image */}
            {product.images[0] && (
              <div className="mt-4 h-48 w-full overflow-hidden bg-slate-100">
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="mt-4 px-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#315c4c]">{product.brand}</p>
              <h1 className="mt-1 text-xl font-bold text-[#1f2a25]">{product.name}</h1>
              {product.modelNumber && (
                <p className="mt-0.5 font-mono text-xs text-slate-400">型番: {product.modelNumber}</p>
              )}
            </div>
          </>
        )}

        {/* Rating form or success */}
        <div className="mt-6 px-5">
          {productLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : product && (
            done ? (
              <SuccessScreen
                product={product}
                criteria={criteria}
              />
            ) : (
              <>
                <p className="mb-4 text-sm font-bold text-[#315c4c]">基準別に評価する</p>
                <RatingForm
                  product={product}
                  criteria={criteria}
                  onDone={async () => {
                    await refetchProduct();
                    setDone(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            )
          )}
        </div>
      </div>
    </main>
  );
}
