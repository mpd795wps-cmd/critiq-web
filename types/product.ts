export type CriterionRating = {
  score: number;
  count: number;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  ratings: Record<string, CriterionRating>;
};