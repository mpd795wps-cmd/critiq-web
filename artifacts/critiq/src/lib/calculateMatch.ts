import type { ApiProduct, ApiCriterion } from '@/types/api';

export type MatchCriterion = {
  id: number;
  name: string;
  score: number;
  count: number;
  isUnrated: boolean;
};

export type MatchResult = {
  percentage: number;
  averageScore: number;
  overallAverageScore: number;
  reviewCount: number;
  matchedCriteria: MatchCriterion[];
  otherCriteria: MatchCriterion[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// rated DESC → unrated at bottom
function sortCriteria(list: MatchCriterion[]): MatchCriterion[] {
  return list.sort((a, b) => {
    if (a.isUnrated !== b.isUnrated) return a.isUnrated ? 1 : -1;
    return b.score - a.score;
  });
}

export function calculateMatch(
  product: ApiProduct,
  criteria: ApiCriterion[],
  selectedCriteriaIds: number[],
): MatchResult {
  const selectedSet = new Set(selectedCriteriaIds);
  const ratingsMap = new Map(product.ratings.map((r) => [r.criterionId, r]));

  // 選択済み基準：評価がなくても全件含める
  const matchedCriteria = sortCriteria(
    selectedCriteriaIds.map((id) => {
      const criterion = criteria.find((c) => c.id === id);
      const rating = ratingsMap.get(id);
      return {
        id,
        name: criterion?.name ?? `基準 ${id}`,
        score: rating?.score ?? 0,
        count: rating?.count ?? 0,
        isUnrated: !rating,
      };
    }),
  );

  // その他基準：カテゴリの全アクティブ基準を含める（評価なし基準も表示）
  const otherCriteria = sortCriteria(
    criteria
      .filter((c) => !selectedSet.has(c.id))
      .map((c) => {
        const rating = ratingsMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          score: rating?.score ?? 0,
          count: rating?.count ?? 0,
          isUnrated: !rating,
        };
      }),
  );

  // 一致率は評価済み選択基準のみで計算
  const ratedMatched = matchedCriteria.filter((c) => !c.isUnrated);
  const averageScore =
    ratedMatched.length > 0
      ? ratedMatched.reduce((t, c) => t + c.score, 0) / ratedMatched.length
      : 0;

  const overallAverageScore =
    product.ratings.length > 0
      ? product.ratings.reduce((t, r) => t + r.score, 0) / product.ratings.length
      : 0;

  return {
    percentage: Math.round((averageScore / 5) * 100),
    averageScore: round1(averageScore),
    overallAverageScore: round1(overallAverageScore),
    reviewCount: product.reviewCount,
    matchedCriteria,
    otherCriteria,
  };
}
