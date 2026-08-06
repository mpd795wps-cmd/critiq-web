import type { ApiProduct, ApiCriterion } from '@/types/api';

export type MatchCriterion = {
  id: number;
  name: string;

  userScore: number;
  userPoints: number;
  userCount: number;
  hasUserRating: boolean;

  aiScore: number;
  aiPoints: number;
  hasAiRating: boolean;

  isUnrated: boolean;
};

export type MatchResult = {
  percentage: number;
  hasAnyRating: boolean;

  userAveragePoints: number | null;
  aiAveragePoints: number | null;
  userWeight: number;
  aiWeight: number;

  overallAverageScore: number;
  aiAverageScore: number;
  reviewCount: number;

  matchedCriteria: MatchCriterion[];
  otherCriteria: MatchCriterion[];
};

function starToPoints(score: number): number {
  return Math.round(score * 20);
}

function criterionSortScore(criterion: MatchCriterion): number {
  if (criterion.hasUserRating && criterion.hasAiRating) {
    return criterion.userScore * 0.7 + criterion.aiScore * 0.3;
  }

  if (criterion.hasUserRating) {
    return criterion.userScore;
  }

  if (criterion.hasAiRating) {
    return criterion.aiScore;
  }

  return 0;
}

function sortCriteria(list: MatchCriterion[]): MatchCriterion[] {
  return list.sort((a, b) => {
    if (a.isUnrated !== b.isUnrated) {
      return a.isUnrated ? 1 : -1;
    }

    return criterionSortScore(b) - criterionSortScore(a);
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateMatch(
  product: ApiProduct,
  criteria: ApiCriterion[],
  selectedCriteriaIds: number[],
): MatchResult {
  const selectedSet = new Set(selectedCriteriaIds);

  const userRatingsMap = new Map(
    product.ratings.map((rating) => [rating.criterionId, rating]),
  );

  const aiRatingsMap = new Map(
    (product.aiRatings ?? []).map((rating) => [
      rating.criterionId,
      rating,
    ]),
  );

  function createCriterion(id: number, name: string): MatchCriterion {
    const userRating = userRatingsMap.get(id);
    const aiRating = aiRatingsMap.get(id);

    const userScore = userRating?.score ?? 0;
    const aiScore = aiRating?.score ?? 0;

    return {
      id,
      name,

      userScore,
      userPoints: userRating ? starToPoints(userScore) : 0,
      userCount: userRating?.count ?? 0,
      hasUserRating: Boolean(userRating),

      aiScore,
      aiPoints: aiRating ? starToPoints(aiScore) : 0,
      hasAiRating: Boolean(aiRating),

      isUnrated: !userRating && !aiRating,
    };
  }

  const matchedCriteria = sortCriteria(
    selectedCriteriaIds.map((id) => {
      const criterion = criteria.find((item) => item.id === id);

      return createCriterion(
        id,
        criterion?.name ?? `基準 ${id}`,
      );
    }),
  );

  const otherCriteria = sortCriteria(
    criteria
      .filter((criterion) => !selectedSet.has(criterion.id))
      .map((criterion) =>
        createCriterion(criterion.id, criterion.name),
      ),
  );

  const userAveragePoints = average(
    matchedCriteria
      .filter((criterion) => criterion.hasUserRating)
      .map((criterion) => criterion.userPoints),
  );

  const aiAveragePoints = average(
    matchedCriteria
      .filter((criterion) => criterion.hasAiRating)
      .map((criterion) => criterion.aiPoints),
  );

  let percentage = 0;
  let userWeight = 0;
  let aiWeight = 0;

  if (userAveragePoints !== null && aiAveragePoints !== null) {
    userWeight = 0.7;
    aiWeight = 0.3;
    percentage = Math.round(
      userAveragePoints * userWeight +
      aiAveragePoints * aiWeight,
    );
  } else if (userAveragePoints !== null) {
    userWeight = 1;
    percentage = Math.round(userAveragePoints);
  } else if (aiAveragePoints !== null) {
    aiWeight = 1;
    percentage = Math.round(aiAveragePoints);
  }

  const overallAverageScore =
    product.ratings.length > 0
      ? product.ratings.reduce(
          (sum, rating) => sum + rating.score,
          0,
        ) / product.ratings.length
      : 0;

  const aiRatings = product.aiRatings ?? [];

  const aiAverageScore =
    aiRatings.length > 0
      ? aiRatings.reduce(
          (sum, rating) => sum + rating.score,
          0,
        ) / aiRatings.length
      : 0;

  return {
    percentage,
    hasAnyRating:
      userAveragePoints !== null || aiAveragePoints !== null,

    userAveragePoints:
      userAveragePoints === null
        ? null
        : Math.round(userAveragePoints),

    aiAveragePoints:
      aiAveragePoints === null
        ? null
        : Math.round(aiAveragePoints),

    userWeight,
    aiWeight,

    overallAverageScore:
      Math.round(overallAverageScore * 10) / 10,

    aiAverageScore:
      Math.round(aiAverageScore * 10) / 10,

    reviewCount: product.reviewCount,
    matchedCriteria,
    otherCriteria,
  };
}
