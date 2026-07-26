import type { ApiProduct, ApiCriterion } from '@/types/api';

export type MatchCriterion = {
  id: number;
  name: string;
  score: number;        // 1-5 stars (0 = unrated)
  points: number;       // star * 20, 0 if unrated
  count: number;
  isUnrated: boolean;
};

export type MatchResult = {
  percentage: number;
  hasAnyRating: boolean;        // true if at least one selected criterion is rated
  overallAverageScore: number;
  reviewCount: number;
  matchedCriteria: MatchCriterion[];
  otherCriteria: MatchCriterion[];
};

// rated DESC → unrated at bottom
function sortCriteria(list: MatchCriterion[]): MatchCriterion[] {
  return list.sort((a, b) => {
    if (a.isUnrated !== b.isUnrated) return a.isUnrated ? 1 : -1;
    return b.score - a.score;
  });
}

/** ★1=20点, ★2=40点, ★3=60点, ★4=80点, ★5=100点, 未評価=0点 */
function starToPoints(score: number): number {
  return Math.round(score) * 20;
}

export function calculateMatch(
  product: ApiProduct,
  criteria: ApiCriterion[],
  selectedCriteriaIds: number[],
): MatchResult {
  const selectedSet = new Set(selectedCriteriaIds);
  const ratingsMap = new Map(product.ratings.map((r) => [r.criterionId, r]));

  // 選択済み基準（評価なしも含む・0点として計算）
  const matchedCriteria = sortCriteria(
    selectedCriteriaIds.map((id) => {
      const criterion = criteria.find((c) => c.id === id);
      const rating = ratingsMap.get(id);
      const score = rating?.score ?? 0;
      return {
        id,
        name: criterion?.name ?? `基準 ${id}`,
        score,
        points: rating ? starToPoints(score) : 0,
        count: rating?.count ?? 0,
        isUnrated: !rating,
      };
    }),
  );

  // その他基準：カテゴリの全アクティブ基準（選択外）
  const otherCriteria = sortCriteria(
    criteria
      .filter((c) => !selectedSet.has(c.id))
      .map((c) => {
        const rating = ratingsMap.get(c.id);
        const score = rating?.score ?? 0;
        return {
          id: c.id,
          name: c.name,
          score,
          points: rating ? starToPoints(score) : 0,
          count: rating?.count ?? 0,
          isUnrated: !rating,
        };
      }),
  );

  // 一致率 = 選択した基準の点数合計 ÷ 選択した基準数
  const totalPoints = matchedCriteria.reduce((sum, c) => sum + c.points, 0);
  const percentage =
    matchedCriteria.length > 0
      ? Math.round(totalPoints / matchedCriteria.length)
      : 0;

  const hasAnyRating = matchedCriteria.some((c) => !c.isUnrated);

  const overallAverageScore =
    product.ratings.length > 0
      ? product.ratings.reduce((t, r) => t + r.score, 0) / product.ratings.length
      : 0;

  return {
    percentage,
    hasAnyRating,
    overallAverageScore: Math.round(overallAverageScore * 10) / 10,
    reviewCount: product.reviewCount,
    matchedCriteria,
    otherCriteria,
  };
}
