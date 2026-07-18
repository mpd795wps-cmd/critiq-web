import { Link } from 'wouter';
import type { MatchCriterion, MatchResult, Product } from '@/types/product';

type ProductCardProps = {
  product: Product;
  match: MatchResult;
};

function StarRating({ score }: { score: number }) {
  const filledCount = Math.round(score);
  return (
    <span
      className="inline-flex items-center gap-2"
      aria-label={`5点満点中${score.toFixed(1)}点`}
    >
      <span className="text-amber-500" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) =>
          index < filledCount ? '★' : '☆',
        ).join('')}
      </span>
      <span className="font-bold text-slate-700">{score.toFixed(1)}</span>
    </span>
  );
}

function CriterionRow({
  criterion,
  selected,
}: {
  criterion: MatchCriterion;
  selected: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {selected && (
          <span className="font-bold text-emerald-600" aria-hidden="true">✔</span>
        )}
        <span className="truncate text-sm font-medium text-slate-700">{criterion.name}</span>
      </div>
      <StarRating score={criterion.score} />
    </li>
  );
}

export default function ProductCard({ product, match }: ProductCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{product.brand}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{product.name}</h2>
          <p className="mt-3 font-semibold text-slate-700">
            ¥{product.price.toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">あなたとの一致率</p>
          <p className="mt-1 text-3xl font-black text-emerald-700">
            {match.percentage}
            <span className="text-base">%</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-5">
        <StarRating score={match.overallAverageScore} />
        <span className="text-sm text-slate-500">
          （{match.reviewCount.toLocaleString('ja-JP')}件）
        </span>
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">評価されたポイント</h3>
        <ul className="mt-2 divide-y divide-slate-100">
          {match.matchedCriteria.map((criterion) => (
            <CriterionRow key={criterion.id} criterion={criterion} selected />
          ))}
        </ul>
      </section>

      {match.otherCriteria.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">参考情報</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {match.otherCriteria.map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} selected={false} />
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/product/${product.id}`}
        className="mt-5 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        商品詳細を見る
      </Link>
    </article>
  );
}
