import type {
  MatchCriterion,
  MatchResult,
  Product,
} from "@/types/product";

type ProductCardProps = {
  product: Product;
  match: MatchResult;
};

function StarRating({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const roundedScore = Math.round(score);
  const stars = Array.from(
    { length: 5 },
    (_, index) => index < roundedScore,
  );

  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`5点満点中${score.toFixed(1)}点`}
    >
      <span
        className={
          compact
            ? "text-sm tracking-tight text-amber-500"
            : "text-base tracking-tight text-amber-500"
        }
        aria-hidden="true"
      >
        {stars
          .map((isFilled) => (isFilled ? "★" : "☆"))
          .join("")}
      </span>

      <span className="font-bold text-slate-700">
        {score.toFixed(1)}
      </span>
    </span>
  );
}

function CriterionRow({
  criterion,
  symbol,
}: {
  criterion: MatchCriterion;
  symbol: "check" | "reference";
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={
            symbol === "check"
              ? "font-bold text-emerald-600"
              : "font-bold text-slate-400"
          }
          aria-hidden="true"
        >
          {symbol === "check" ? "✔" : "△"}
        </span>

        <span className="truncate text-sm font-medium text-slate-700">
          {criterion.name}
        </span>
      </div>

      <StarRating score={criterion.score} compact />
    </li>
  );
}

export default function ProductCard({
  product,
  match,
}: ProductCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              {product.brand}
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {product.name}
            </h2>

            <p className="mt-3 text-base font-semibold text-slate-700">
              ¥{product.price.toLocaleString("ja-JP")}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-emerald-700">
              あなたとの一致率
            </p>

            <p className="mt-1 text-3xl font-black text-emerald-700">
              {match.percentage}
              <span className="ml-0.5 text-base">%</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 pb-5">
          <StarRating score={match.overallAverageScore} />

          <span className="text-sm text-slate-500">
            レビュー{match.reviewCount.toLocaleString("ja-JP")}件
          </span>
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-bold text-slate-900">
            評価されたポイント
          </h3>

          {match.matchedCriteria.length > 0 ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {match.matchedCriteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  symbol="check"
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              評価基準が選択されていません。
            </p>
          )}
        </section>

        {match.otherCriteria.length > 0 && (
          <details className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-slate-700">
              <span className="flex items-center justify-between">
                参考情報
                <span
                  className="text-xs font-medium text-slate-500"
                  aria-hidden="true"
                >
                  表示する
                </span>
              </span>
            </summary>

            <ul className="mt-2 divide-y divide-slate-200">
              {match.otherCriteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  symbol="reference"
                />
              ))}
            </ul>
          </details>
        )}

        <button
          type="button"
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          商品を見る
        </button>
      </div>
    </article>
  );
}