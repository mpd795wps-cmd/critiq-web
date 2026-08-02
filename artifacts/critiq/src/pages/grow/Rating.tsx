import { useState, useEffect, useRef } from 'react';
import { Link, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiProduct, ApiCriterion } from '@/types/api';

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

function InlineRatingForm({
  product,
  criteria,
  onDone,
}: {
  product: ApiProduct;
  criteria: ApiCriterion[];
  onDone: () => void;
}) {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: myRatingData } = useQuery({
    queryKey: ['my-rating', product.id],
    queryFn: () => api.products.myRating(product.id),
  });

  // Pre-populate with previous ratings once loaded
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

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const hasPrevRatings = Object.keys(myRatingData?.ratings ?? {}).length > 0;
  const ratedCount = Object.values(scores).filter((v) => v > 0).length;

  async function handleSubmit() {
    if (ratedCount === 0) { setError('少なくとも1つの基準を評価してください。'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.products.submitRating(product.id, scores, comments);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={formRef} className="border-t border-[#dce5df] bg-[#f1f6f3] px-4 pb-4 pt-3">
      {hasPrevRatings && (
        <p className="mb-3 rounded-xl bg-[#e8f0eb] px-3 py-2 text-xs text-[#315c4c]">
          ✏️ 前回の評価が入力されています。変更して再送信できます。
        </p>
      )}
      <p className="mb-3 text-sm font-bold text-[#315c4c]">基準別に評価する</p>
      {criteria.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400 animate-pulse">基準を読み込み中…</p>
      )}
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 0;
          const prevScore = myRatingData?.ratings[String(criterion.id)];
          const comment = comments[criterion.id] ?? '';
          return (
            <div key={criterion.id}
              className={`rounded-xl border bg-white p-4 transition ${score > 0 ? 'border-[#4d7c67]' : 'border-[#dce5df]'}`}>
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
      {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={ratedCount === 0 || submitting}
        className="mt-4 w-full rounded-xl bg-[#315c4c] px-4 py-3 font-bold text-white transition hover:bg-[#284b3f] disabled:cursor-not-allowed disabled:bg-slate-300">
        {submitting ? '送信中…' : ratedCount === 0 ? '評価を入力してください' : hasPrevRatings ? `${ratedCount}件の評価を更新する` : `${ratedCount}件の評価を送信する`}
      </button>
    </div>
  );
}

// ── Product row (shared between grouped and flat views) ───────
function ProductRow({
  product,
  catName,
  criteria,
  expandedId,
  doneIds,
  onToggle,
  onDone,
}: {
  product: ApiProduct;
  catName: string;
  criteria: ApiCriterion[];
  expandedId: number | null;
  doneIds: Set<number>;
  onToggle: (id: number) => void;
  onDone: (id: number) => void;
}) {
  const isExpanded = expandedId === product.id;
  const isDone = doneIds.has(product.id);
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isExpanded ? 'border-[#315c4c]' : 'border-[#dce5df]'}`}>
      <Link
        href={`/grow/rating/${product.id}`}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-[#f1f6f3]">
        {product.images[0] && <img src={product.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#315c4c]">{catName}</p>
          <p className="mt-0.5 font-bold text-[#1f2a25]">{product.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{product.brand}{product.modelNumber ? ` · ${product.modelNumber}` : ''}</p>
        </div>
        {isDone ? (
          <span className="shrink-0 text-xs font-bold text-[#315c4c]">
            ✓ 評価済み
          </span>
        ) : (
          <span className="shrink-0 text-lg text-[#315c4c]" aria-hidden="true">
            →
          </span>
        )}
      </Link>
    </div>
  );
}

export default function GrowRating() {
  const search = useSearch();
  const productIdFromUrl = new URLSearchParams(search).get('productId');
  const initialProductId = productIdFromUrl ? parseInt(productIdFromUrl, 10) : null;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-for-rating'],
    queryFn: async () => {
      const cats = await api.categories.list();
      const results = await Promise.all(cats.map((c) => api.products.list(c.id)));
      return results.flat();
    },
  });

  const { data: allCriteria = [] } = useQuery({
    queryKey: ['all-criteria-for-rating'],
    queryFn: async () => {
      const cats = await api.categories.list();
      const results = await Promise.all(cats.map((c) => api.criteria.list(c.id)));
      return results.flat();
    },
  });

  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(initialProductId);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (initialProductId && allProducts.length > 0) setExpandedId(initialProductId);
  }, [allProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }
  function markDone(id: number) {
    setDoneIds((prev) => new Set([...prev, id]));
    setExpandedId(null);
  }

  // ── Filter / grouping logic ───────────────────────────────
  const trimmed = query.trim();
  const matchedCategory = trimmed
    ? categories.find((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()))
    : null;

  let displayProducts: ApiProduct[];
  if (matchedCategory) {
    // Category name matched → show all products in that category
    displayProducts = allProducts.filter((p) => p.categoryId === matchedCategory.id);
  } else if (trimmed) {
    // Free-text search by name / brand / model
    const q = trimmed.toLowerCase();
    displayProducts = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.modelNumber.toLowerCase().includes(q),
    );
  } else {
    displayProducts = allProducts;
  }

  // Group when no query or when a category matched
  const useGrouped = !trimmed || !!matchedCategory;
  const grouped = useGrouped
    ? categories
        .map((cat) => ({ cat, products: displayProducts.filter((p) => p.categoryId === cat.id) }))
        .filter((g) => g.products.length > 0)
    : [];

  return (
    <main className="min-h-screen bg-[#edf1ed] text-[#1f2a25]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[#f8faf8] pb-12">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-8 pb-2">
          <Link href="/grow" className="text-sm font-bold text-[#315c4c]">← 育てる</Link>
          <Link href="/explore" className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white">← 探す</Link>
        </div>

        <div className="px-5 pt-3">
          <p className="text-sm font-bold text-[#315c4c]">CRITIQ</p>
          <h1 className="mt-2 text-2xl font-bold">商品を評価する</h1>
          <p className="mt-2 text-sm leading-6 text-[#68746e]">評価したい商品を選んでタップしてください。</p>
        </div>

        {/* search */}
        <div className="mt-5 px-5">
          <div className="flex items-center rounded-2xl border border-[#dce5df] bg-white px-4 shadow-sm">
            <span className="mr-3 text-lg" aria-hidden="true">🔍</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="商品名・メーカー・カテゴリで検索"
              className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9aa49f]" />
          </div>
        </div>

        {/* product list */}
        <div className="mt-4 px-5">
          {displayProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">商品が見つかりません</p>
          ) : useGrouped ? (
            // ── Grouped by category ───────────────────────────────
            <div className="space-y-6">
              {grouped.map(({ cat, products }) => (
                <div key={cat.id}>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#315c4c]">
                    <span className="h-px flex-1 bg-[#dce5df]" />
                    <span>{cat.name}</span>
                    <span className="h-px flex-1 bg-[#dce5df]" />
                  </h2>
                  <div className="space-y-2">
                    {products.map((p) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        catName={cat.name}
                        criteria={allCriteria.filter((c) => c.categoryId === p.categoryId)}
                        expandedId={expandedId}
                        doneIds={doneIds}
                        onToggle={toggleExpand}
                        onDone={markDone}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // ── Flat filtered list ────────────────────────────────
            <div className="space-y-2">
              {displayProducts.map((p) => {
                const catName = categories.find((c) => c.id === p.categoryId)?.name ?? '';
                return (
                  <ProductRow
                    key={p.id}
                    product={p}
                    catName={catName}
                    criteria={allCriteria.filter((c) => c.categoryId === p.categoryId)}
                    expandedId={expandedId}
                    doneIds={doneIds}
                    onToggle={toggleExpand}
                    onDone={markDone}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
