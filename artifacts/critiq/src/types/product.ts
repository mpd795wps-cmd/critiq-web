export type ProductRating = {
  score: number;
  count: number;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  brand: string;
  price: number;
  modelNumber: string;
  janCode?: string;
  /** index 0 = メイン画像、以降サブ画像 */
  images: string[];
  reviewCount: number;
  ratings: Record<string, ProductRating>;
};

export type MatchCriterion = {
  id: string;
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
