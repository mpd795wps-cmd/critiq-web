import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearch } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { calculateMatch } from '@/lib/calculateMatch';
import ProductCard from '@/components/ProductCard';
import type { ApiCriterion } from '@/types/api';

const HELPFUL_KEY = 'critiq_helpful';
function getHelpedSet(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(HELPFUL_KEY) ?? '[]')); } catch { return new Set(); }
}
function markHelped(id: number) {
  const s = getHelpedSet(); s.add(id);
  localStorage.setItem(HELPFUL_KEY, JSON.stringify([...s]));
}

function HelpfulChip({ criterion, onHelped }: { criterion: ApiCriterion; onHelped: (id: number, count: number) => void }) {
  const [helped, setHelped] = useState(() => getHelpedSet().has(criterion.id));
  const [count, setCount] = useState(criterion.helpfulCount);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (helped || loading) return;
    setLoading(true);
    try {
      const res = await api.criteria.helpful(criterion.id);
      markHelped(criterion.id);
      setHelped(true);
      setCount(res.helpfulCount);
      onHelped(criterion.id, res.helpfulCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 pl-3 pr-1 py-1.5 text-xs font-semibold text-white">
      <span>{criterion.name}</span>
      {criterion.isOfficial
        ? <span className="ml-1 rounded-full bg-[#315c4c] px-1.5 py-0.5 text-[9px] font-bold">公式</span>
        : criterion.createdByUsername
          ? <span className="ml-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px]">by {criterion.createdByUsername}</span>
          : null
      }
      <button
        type="button"
        onClick={handleClick}
        disabled={helped || loading}
        title={helped ? '参考になった済み' : '参考になった'}
        className={`ml-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
          helped ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
        }`}
      >
        <span>👍</span>
        <span>{count}</span>
      </button>
    </span>
  );
}

export default function Results() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [productSearch, setProductSearch] = useState('');
  const search = useSearch();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(search);
  const selectedCriteriaIds = Array.from(
    new Set(
      params.getAll('criteria')
        .flatMap((v) => v.split(','))
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => !isNaN(n)),
    ),
  );

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const category = categories.find((c) => c.slug === categorySlug);

  const { data: criteria = [] } = useQuery({
    queryKey: ['criteria', category?.id],
    queryFn: () => api.criteria.list(category!.id),
    enabled: !!category,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category?.id],
    queryFn: () => api.products.list(category!.id),
    enabled: !!category,
  });

  // Track search: increment search_count for selected criteria (once per page load)
  const trackedRef = useRef(false);
  useEffect(() => {
    if (trackedRef.current || selectedCriteriaIds.length === 0) return;
    trackedRef.current = true;
    api.criteria.trackSearch(selectedCriteriaIds).catch(() => {/* silent */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCriteria = selectedCriteriaIds
    .map((id) => criteria.find((c) => c.id === id))
    .filter(Boolean) as ApiCriterion[];

  const matchedProducts = products
    .map((product) => ({
      product,
      match: calculateMatch(product, criteria, selectedCriteriaIds),
    }))
    .sort(
      (a, b) =>
        b.match.percentage - a.match.percentage ||
        b.match.overallAverageScore - a.match.overallAverageScore,
    );

  const normalizedProductSearch = productSearch
    .trim()
    .toLowerCase();

  const filteredProducts = normalizedProductSearch
    ? matchedProducts.filter(({ product }) => {
        const searchableText = [
          product.name,
          product.brand,
          product.modelNumber ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedProductSearch);
      })
    : matchedProducts;

  function handleHelped(criterionId: number, newCount: number) {
    queryClient.setQueryData<ApiCriterion[]>(['criteria', category?.id], (prev) =>
      prev?.map((c) => c.id === criterionId ? { ...c, helpfulCount: newCount } : c) ?? []
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/explore/${categorySlug}`}
            className="text-sm font-semibold text-slate-600"
          >
            ← 基準選択に戻る
          </Link>
          <Link
            href="/grow"
            className="rounded-full border border-[#315c4c] px-3 py-1.5 text-xs font-bold text-[#315c4c] transition hover:bg-[#315c4c] hover:text-white"
          >
            育てる →
          </Link>
        </div>

        <header className="mt-6">
          <p className="text-sm font-semibold text-emerald-700">CRITIQ</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">検索結果</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            選択した基準との一致率が高い順に表示しています。
          </p>
        </header>

        <section className="mt-6">
          <p className="text-sm font-bold text-slate-900">選択した基準</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCriteria.length > 0 ? (
              selectedCriteria.map((criterion) => (
                <HelpfulChip key={criterion.id} criterion={criterion} onHelped={handleHelped} />
              ))
            ) : (
              <span className="text-sm text-slate-500">基準が選択されていません。</span>
            )}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="product-search"
              className="text-sm font-bold text-slate-900"
            >
              商品名などで絞り込む
            </label>

            <div className="relative mt-2">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                🔍
              </span>

              <input
                id="product-search"
                type="search"
                value={productSearch}
                onChange={(event) =>
                  setProductSearch(event.target.value)
                }
                placeholder="商品名・メーカー・型番を入力"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#315c4c] focus:ring-2 focus:ring-[#315c4c]/10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              商品一覧
            </h2>
            <p className="text-sm text-slate-500">
              {isLoading ? '…' : `${filteredProducts.length}件`}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map(({ product, match }) => (
              <ProductCard key={product.id} product={product} match={match} />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-600">
                {productSearch.trim()
                  ? '検索条件に一致する商品がありません。'
                  : '該当する商品がまだ登録されていません。'}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
