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
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

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
      <p className="mb-3 text-sm font-bold text-[#315c4c]">基準別に評価する</p>
      {criteria.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400 animate-pulse">基準を読み込み中…</p>
      )}
      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 0;
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
                {score > 0 && <span className="shrink-0 text-xs font-bold text-[#315c4c]">{score}.0</span>}
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
        {submitting ? '送信中…' : ratedCount === 0 ? '評価を入力してください' : `${ratedCount}件の評価を送信する`}
      </button>
    </div>
  );
}

export default function GrowRating() {
  const search = useSearch();
  const productIdFromUrl = new URLSearchParams(search).get('productId');
  const initialProductId = productIdFromUrl ? parseInt(productIdFromUrl, 10) : null;

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(initialProductId);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  // Auto-expand URL-specified product once products load
  useEffect(() => {
    if (initialProductId && allProducts.length > 0) {
      setExpandedId(initialProductId);
    }
  }, [allProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProducts = allProducts.filter(
    (p) => p.name.includes(query) || p.brand.toLowerCase().includes(query.toLowerCase()) || p.modelNumber.toLowerCase().includes(query.toLowerCase()),
  );

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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
              placeholder="商品名・メーカー・型番で検索"
              className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9aa49f]" />
          </div>
        </div>

        {/* product list */}
        <div className="mt-4 space-y-2 px-5">
          {filteredProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">商品が見つかりません</p>
          ) : filteredProducts.map((p) => {
            const catName = categories.find((c) => c.id === p.categoryId)?.name ?? '';
            const isExpanded = expandedId === p.id;
            const isDone = doneIds.has(p.id);
            const criteria = allCriteria.filter((c) => c.categoryId === p.categoryId);

            return (
              <div key={p.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isExpanded ? 'border-[#315c4c]' : 'border-[#dce5df]'}`}>
                {/* product row */}
                <button type="button"
                  onClick={() => !isDone && toggleExpand(p.id)}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition ${isDone ? 'opacity-60 cursor-default' : 'hover:bg-[#f1f6f3]'}`}>
                  {p.images[0] && <img src={p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#315c4c]">{catName}</p>
                    <p className="mt-0.5 font-bold text-[#1f2a25]">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{p.brand} · {p.modelNumber}</p>
                  </div>
                  {isDone ? (
                    <span className="shrink-0 text-sm font-bold text-[#315c4c]">✓ 評価済み</span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </button>

                {/* inline rating form */}
                {isExpanded && !isDone && (
                  <InlineRatingForm
                    key={p.id}
                    product={p}
                    criteria={criteria}
                    onDone={() => {
                      setDoneIds((prev) => new Set([...prev, p.id]));
                      setExpandedId(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
