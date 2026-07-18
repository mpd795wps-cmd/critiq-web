import { Link, useParams, useSearch } from 'wouter';
import { getCriterionLabel } from '@/data/criteria';
import { products } from '@/data/products';
import { calculateMatch } from '@/lib/calculateMatch';
import ProductCard from '@/components/ProductCard';

export default function Results() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const selectedCriteria = Array.from(
    new Set(
      params
        .getAll('criteria')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const matchedProducts = products
    .filter((product) => product.categoryId === categoryId)
    .map((product) => ({
      product,
      match: calculateMatch(product, selectedCriteria),
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
            href={`/explore/${categoryId}`}
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
              selectedCriteria.map((criterionId) => (
                <span
                  key={criterionId}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  {getCriterionLabel(criterionId)}
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
            <p className="text-sm text-slate-500">{matchedProducts.length}件</p>
          </div>

          {matchedProducts.length > 0 ? (
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
