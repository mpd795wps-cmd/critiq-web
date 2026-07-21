import { Link, useParams, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { calculateMatch } from '@/lib/calculateMatch';
import ProductCard from '@/components/ProductCard';

export default function Results() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const search = useSearch();

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

  const selectedCriteriaNames = selectedCriteriaIds
    .map((id) => criteria.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

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
            {selectedCriteriaNames.length > 0 ? (
              selectedCriteriaNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">基準が選択されていません。</span>
            )}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">商品一覧</h2>
            <p className="text-sm text-slate-500">{isLoading ? '…' : `${matchedProducts.length}件`}</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200" />
              ))}
            </div>
          ) : matchedProducts.length > 0 ? (
            matchedProducts.map(({ product, match }) => (
              <ProductCard key={product.id} product={product} match={match} />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-600">
                該当する商品がまだ登録されていません。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
