import type { ApiProduct, ApiCriterion, ApiRatingEntry } from '@/types/api';

export type MatchCriterion = {
  id: number;
  name: string;
  score: number;
  count: number;
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

function toMatchCriterion(entry: ApiRatingEntry, criteria: ApiCriterion[]): MatchCriterion {
  const criterion = criteria.find((c) => c.id === entry.criterionId);
  return {
    id: entry.criterionId,
    name: criterion?.name ?? `基準 ${entry.criterionId}`,
    score: entry.score,
    count: entry.count,
  };
}

export function calculateMatch(
  product: ApiProduct,
  criteria: ApiCriterion[],
  selectedCriteriaIds: number[],
): MatchResult {
  const selectedSet = new Set(selectedCriteriaIds);

  const matchedEntries = product.ratings.filter((r) => selectedSet.has(r.criterionId));
  const otherEntries = product.ratings
    .filter((r) => !selectedSet.has(r.criterionId))
    .sort((a, b) => b.score - a.score);

  const matchedCriteria = matchedEntries.map((r) => toMatchCriterion(r, criteria));
  const otherCriteria = otherEntries.map((r) => toMatchCriterion(r, criteria));

  const averageScore =
    matchedCriteria.length > 0
      ? matchedCriteria.reduce((t, c) => t + c.score, 0) / matchedCriteria.length
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
