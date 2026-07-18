import type { Product } from "@/types/product";

export function calculateMatch(
  product: Product,
  selectedCriteria: string[],
): number {
  if (selectedCriteria.length === 0) {
    return 0;
  }

  const scores = selectedCriteria
    .map((criterionId) => product.ratings[criterionId]?.score)
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) {
    return 0;
  }

  const averageScore =
    scores.reduce((total, score) => total + score, 0) / scores.length;

  return Math.round((averageScore / 5) * 100);
}