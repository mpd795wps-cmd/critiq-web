import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiCriterion } from '@/types/api';
import { usePageMeta } from '@/hooks/usePageMeta';

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

function ExpandableDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className={`text-sm leading-relaxed text-[#68746e] whitespace-pre-line ${expanded ? '' : 'line-clamp-5'}`}>
        {description}
      </p>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs font-semibold text-[#315c4c] hover:underline"
      >
        {expanded ? '閉じる ▲' : 'もっと見る ▼'}
      </button>
    </div>
  );
}

const HELPFUL_KEY = 'critiq_helpful';
function getHelpedSet(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(HELPFUL_KEY) ?? '[]')); } catch { return new Set(); }
}
function markHelped(id: number) {
  const s = getHelpedSet(); s.add(id);
  localStorage.setItem(HELPFUL_KEY, JSON.stringify([...s]));
}

function CriterionBadge({ criterion }: { criterion: ApiCriterion }) {
  if (criterion.isOfficial) {
    return <span className="rounded-full bg-[#e8f0eb] px-2 py-0.5 text-[10px] font-bold text-[#315c4c]">公式</span>;
  }
  if (criterion.createdByUsername) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">by {criterion.createdByUsername}</span>;
  }
  return null;
}

function HelpfulButton({ criterion, onHelped }: { criterion: ApiCriterion; onHelped: (id: number, count: number) => void }) {
  const [helped, setHelped] = useState(() => getHelpedSet().has(criterion.id));
  const [count, setCount] = useState(criterion.helpfulCount);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (helped || loading) return;
    setLoading(true);
    try {
      const res = await api.criteria.helpful(criterion.id);
      markHelped(criterion.id);
      setHelped(true);
      setCount(res.helpfulCount);
      onHelped(criterion.id, res.helpfulCount);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  return (
    <button type="button" onClick={handleClick} disabled={helped || loading}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition ${
        helped ? 'bg-[#315c4c] text-white' : 'border border-[#dce5df] text-[#68746e] hover:border-[#315c4c] hover:text-[#315c4c]'
      }`} title="参考になった">
      <span>👍</span><span>{count}</span>
    </button>
  );
}

type Comment = { id: number; criterionId: number; comment: string; createdAt: string };

function CommentAccordion({ criterionId, productId }: { criterionId: number; productId: number }) {
  const [open, setOpen] = useState(false);

  const { data: allComments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['product-comments', productId],
    queryFn: () => api.products.comments(productId),
    enabled: open,
    staleTime: 30_000,
  });

  const comments = allComments.filter((c) => c.criterionId === criterionId);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-[#315c4c] transition hover:underline"
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>このコメントを見る{allComments.length > 0 && ` (${comments.length}件)`}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <p className="text-xs text-slate-400 animate-pulse">読み込み中…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400">まだコメントがありません</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{c.comment}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(c.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const RATINGS_LIMIT = 10;

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const id = parseInt(productId ?? '', 10);
  const queryClient = useQueryClient();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.get(id),
    enabled: !isNaN(id),
    retry: false,
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ['criteria', product?.categoryId],
    queryFn: () => api.criteria.list(product!.categoryId),
    enabled: !!product,
  });

  usePageMeta(
    product ? `${product.name}（${product.brand}）の比較・口コミ｜CRITIQ` : undefined,
    product
      ? `${product.name}の評価・比較をCRITIQで確認。あなたが大切にする基準に合った商品かチェックしよう。`
      : undefined,
  );

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
          <Link href="/explore" className="mt-4 inline-block text-sm text-[#315c4c] underline">探すに戻る</Link>
        </div>
      </main>
    );
  }

  const mainImage = product.images[mainIndex] ?? product.images[0];
  const overallScore =
    product.ratings.length > 0
      ? product.ratings.reduce((s, r) => s + r.score, 0) / product.ratings.length
      : 0;

  const sortedRatings = [...product.ratings].sort((a, b) => b.score - a.score);
  const hasMore = sortedRatings.length > RATINGS_LIMIT;
  const visibleRatings = showAllRatings ? sortedRatings : sortedRatings.slice(0, RATINGS_LIMIT);

  function getCriterion(criterionId: number): ApiCriterion | undefined {
    return criteria.find((c) => c.id === criterionId);
  }

  function handleHelped(criterionId: number, newCount: number) {
    queryClient.setQueryData<ApiCriterion[]>(['criteria', product!.categoryId], (prev) =>
      prev?.map((c) => c.id === criterionId ? { ...c, helpfulCount: newCount } : c) ?? []
    );
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

        {/* Main image */}
        <div className="mt-5 px-5">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            {mainImage
              ? <img key={mainImage} src={mainImage} alt={`${product.name} メイン画像`} className="aspect-[4/3] w-full object-cover" />
              : <div className="flex aspect-[4/3] items-center justify-center text-4xl text-slate-300">📷</div>
            }
          </div>
        </div>

        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {product.images.map((url, index) => (
              <button key={url} type="button" onClick={() => setMainIndex(index)}
                className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  index === mainIndex ? 'border-[#315c4c]' : 'border-transparent opacity-60 hover:opacity-90'
                }`}>
                <img src={url} alt={`サブ画像 ${index + 1}`} className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Product info */}
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
            {/* Description with line-break support */}
            {product.description && (
              <ExpandableDescription description={product.description} />
            )}
          </div>
        </div>

        {/* Rate CTA */}
        <div className="mt-4 px-5">
          <Link href={`/grow/rating/${product.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#315c4c] px-5 py-4 font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">
            <span aria-hidden="true">✎</span>
            <span>この商品を評価する</span>
          </Link>
        </div>

        {/* AI ratings */}
        {product.aiRatings.length > 0 && (
          <div className="mt-4 px-5">
            <div className="rounded-2xl border border-violet-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    🤖 AI評価
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    公開情報をもとに作成した参考評価です。
                  </p>
                </div>

                <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                  {(
                    product.aiRatings.reduce(
                      (sum, rating) => sum + rating.score,
                      0,
                    ) / product.aiRatings.length
                  ).toFixed(1)}
                  /5.0
                </div>
              </div>

              <ul className="mt-4 divide-y divide-slate-100">
                {product.aiRatings.map((rating) => (
                  <li key={rating.criterionId} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-800">
                        {rating.criterionName ?? `基準 ${rating.criterionId}`}
                      </p>

                      <div className="flex shrink-0 items-center gap-2">
                        <StarRating score={rating.score} />
                        <span className="text-xs font-bold text-violet-700">
                          {rating.score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {rating.reason}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">
                AI評価は参考情報です。使用感や効果には個人差があります。
              </p>
            </div>
          </div>
        )}

        {/* Criterion ratings */}
        {product.ratings.length > 0 && (
          <div className="mt-4 px-5 pb-4">
            <div className="rounded-2xl border border-[#dce5df] bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">基準別評価</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {visibleRatings.map((r) => {
                  const criterion = getCriterion(r.criterionId);
                  return (
                    <li key={r.criterionId} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-700">
                              {criterion?.name ?? `基準 ${r.criterionId}`}
                            </span>
                            {criterion && <CriterionBadge criterion={criterion} />}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StarRating score={r.score} />
                          <span className="text-xs text-slate-400">({r.count})</span>
                        </div>
                      </div>
                      {criterion && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <HelpfulButton criterion={criterion} onHelped={handleHelped} />
                        </div>
                      )}
                      <CommentAccordion criterionId={r.criterionId} productId={product.id} />
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <button type="button" onClick={() => setShowAllRatings((v) => !v)}
                  className="mt-4 w-full rounded-xl border border-[#dce5df] py-2 text-xs font-bold text-[#315c4c] transition hover:bg-[#f1f6f3]">
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
