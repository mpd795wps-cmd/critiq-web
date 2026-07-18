import { getCriterionLabel } from "@/data/criteria";
import type {
  MatchCriterion,
  MatchResult,
  Product,
} from "@/types/product";

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function createCriterion(
  product: Product,
  criterionId: string,
): MatchCriterion | null {
  const rating = product.ratings[criterionId];

  if (!rating) {
    return null;
  }

  return {
    id: criterionId,
    name: getCriterionLabel(criterionId),
    score: rating.score,
    count: rating.count,
  };
}

export function calculateMatch(
  product: Product,
  selectedCriteria: string[],
): MatchResult {
  const validSelectedCriteria = Array.from(
    new Set(selectedCriteria),
  ).filter((criterionId) => product.ratings[criterionId]);

  const matchedCriteria = validSelectedCriteria
    .map((criterionId) => createCriterion(product, criterionId))
    .filter(
      (criterion): criterion is MatchCriterion =>
        criterion !== null,
    );

  const selectedSet = new Set(validSelectedCriteria);

  const otherCriteria = Object.keys(product.ratings)
    .filter((criterionId) => !selectedSet.has(criterionId))
    .map((criterionId) => createCriterion(product, criterionId))
    .filter(
      (criterion): criterion is MatchCriterion =>
        criterion !== null,
    )
    .sort((a, b) => b.score - a.score);

  const averageScore =
    matchedCriteria.length > 0
      ? matchedCriteria.reduce(
          (total, criterion) => total + criterion.score,
          0,
        ) / matchedCriteria.length
      : 0;

  const allRatings = Object.values(product.ratings);

  const overallAverageScore =
    allRatings.length > 0
      ? allRatings.reduce(
          (total, rating) => total + rating.score,
          0,
        ) / allRatings.length
      : 0;

  return {
    percentage: Math.round((averageScore / 5) * 100),
    averageScore: roundToOneDecimal(averageScore),
    overallAverageScore: roundToOneDecimal(
      overallAverageScore,
    ),
    reviewCount: product.reviewCount,
    matchedCriteria,
    otherCriteria,
  };
}