import { useState } from 'react';
import { Link } from 'wouter';
import type { ApiProduct } from '@/types/api';
import type {
  MatchCriterion,
  MatchResult,
} from '@/lib/calculateMatch';

type ProductCardProps = {
  product: ApiProduct;
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
        {Array.from(
          { length: 5 },
          (_, index) => (index < filledCount ? '★' : '☆'),
        ).join('')}
      </span>

      <span className="font-bold text-slate-700">
        {score.toFixed(1)}
      </span>
    </span>
  );
}

function RatingLine({
  label,
  score,
  count,
}: {
  label: string;
  score: number | null;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-bold text-slate-700">
        {label}：
      </span>

      {score === null ? (
        <span className="text-slate-400">評価なし</span>
      ) : (
        <>
          <StarRating score={score} />

          {typeof count === 'number' && (
            <span className="text-slate-500">
              （{count.toLocaleString('ja-JP')}件）
            </span>
          )}
        </>
      )}
    </div>
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
    <li className="py-3">
      <div className="flex min-w-0 items-center gap-2">
        {selected && (
          <span
            className="font-bold text-emerald-600"
            aria-hidden="true"
          >
            ✔
          </span>
        )}

        <span className="text-sm font-bold text-slate-700">
          {criterion.name}
        </span>
      </div>

      <div className="mt-2 space-y-1.5 pl-6">
        <RatingLine
          label="ユーザー評価"
          score={
            criterion.hasUserRating
              ? criterion.userScore
              : null
          }
          count={
            criterion.hasUserRating
              ? criterion.userCount
              : undefined
          }
        />

        <RatingLine
          label="AI評価"
          score={
            criterion.hasAiRating
              ? criterion.aiScore
              : null
          }
        />
      </div>
    </li>
  );
}

const INITIAL_SHOW = 3;

function OtherCriteriaSection({
  criteria,
}: {
  criteria: MatchCriterion[];
}) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded
    ? criteria
    : criteria.slice(0, INITIAL_SHOW);

  const hasMore = criteria.length > INITIAL_SHOW;

  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold text-slate-900">
        参考情報
      </h3>

      <ul className="mt-2 divide-y divide-slate-100">
        {visible.map((criterion) => (
          <CriterionRow
            key={criterion.id}
            criterion={criterion}
            selected={false}
          />
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-semibold text-[#315c4c] hover:underline"
        >
          {expanded
            ? '▲ 折りたたむ'
            : `▼ 他 ${criteria.length - INITIAL_SHOW} 件を表示`}
        </button>
      )}
    </section>
  );
}

function MatchExplanation({
  match,
}: {
  match: MatchResult;
}) {
  const userPercentage = Math.round(match.userWeight * 100);
  const aiPercentage = Math.round(match.aiWeight * 100);

  return (
    <div className="w-72 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
      <p className="text-sm font-bold text-slate-900">
        一致率の計算方法
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        選択した基準の星評価を点数に変換し、
        ユーザー評価とAI評価を組み合わせています。
      </p>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
        <p>星1＝20点</p>
        <p>星2＝40点</p>
        <p>星3＝60点</p>
        <p>星4＝80点</p>
        <p>星5＝100点</p>
      </div>

      <div className="mt-3 space-y-1 text-xs leading-5 text-slate-700">
        {match.userAveragePoints !== null && (
          <p>
            ユーザー評価：
            <strong>{match.userAveragePoints}点</strong>
            {' × '}
            {userPercentage}%
          </p>
        )}

        {match.aiAveragePoints !== null && (
          <p>
            AI評価：
            <strong>{match.aiAveragePoints}点</strong>
            {' × '}
            {aiPercentage}%
          </p>
        )}

        <p className="border-t border-slate-200 pt-2 font-bold text-emerald-700">
          一致率：{match.percentage}%
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-4 text-slate-400">
        片方の評価しかない場合は、存在する評価を
        100%使用します。評価のない基準は各平均から
        除外します。
      </p>
    </div>
  );
}

export default function ProductCard({
  product,
  match,
}: ProductCardProps) {
  const thumbnail = product.images?.[0];
  const [showMatchInfo, setShowMatchInfo] = useState(false);

  return (
    <article className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
      {thumbnail && (
        <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-slate-100">
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              {product.brand}
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {product.name}
            </h2>

            <p className="mt-3 font-semibold text-slate-700">
              ¥{product.price.toLocaleString('ja-JP')}
            </p>
          </div>

          <div className="relative shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs font-semibold text-emerald-700">
                あなたとの一致率
              </p>

              <button
                type="button"
                aria-label="一致率の計算方法を表示"
                aria-expanded={showMatchInfo}
                onClick={() =>
                  setShowMatchInfo((value) => !value)
                }
                onMouseEnter={() => setShowMatchInfo(true)}
                onMouseLeave={() => setShowMatchInfo(false)}
                onFocus={() => setShowMatchInfo(true)}
                onBlur={() => setShowMatchInfo(false)}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                i
              </button>
            </div>

            {!match.hasAnyRating ? (
              <p className="mt-1 text-sm font-bold text-emerald-400">
                評価なし
              </p>
            ) : (
              <p className="mt-1 text-3xl font-black text-emerald-700">
                {match.percentage}
                <span className="text-base">%</span>
              </p>
            )}

            {showMatchInfo && (
              <div
                className="absolute right-0 top-full z-30 mt-2"
                onMouseEnter={() => setShowMatchInfo(true)}
                onMouseLeave={() => setShowMatchInfo(false)}
              >
                <MatchExplanation match={match} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2 border-b border-slate-100 pb-5">
          <RatingLine
            label="ユーザー評価"
            score={
              product.ratings.length > 0
                ? match.overallAverageScore
                : null
            }
            count={
              product.ratings.length > 0
                ? match.reviewCount
                : undefined
            }
          />

          <RatingLine
            label="AI評価"
            score={
              (product.aiRatings ?? []).length > 0
                ? match.aiAverageScore
                : null
            }
          />
        </div>

        {match.matchedCriteria.length > 0 && (
          <section className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">
              あなたが選んだ基準
            </h3>

            <ul className="mt-2 divide-y divide-slate-100">
              {match.matchedCriteria.map((criterion) => (
                <CriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  selected
                />
              ))}
            </ul>
          </section>
        )}

        {match.otherCriteria.length > 0 && (
          <OtherCriteriaSection
            criteria={match.otherCriteria}
          />
        )}

        <div className="mt-5 flex flex-col gap-2">
          {product.amazonAffiliateUrl && (
            <a
              href={product.amazonAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-2xl bg-[#FF9900] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e88a00]"
            >
              🛒 Amazonで商品を見る
            </a>
          )}

          <Link
            href={`/product/${product.id}`}
            className="block w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            詳しく商品評価を見る
          </Link>
        </div>
      </div>
    </article>
  );
}
