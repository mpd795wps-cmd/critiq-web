// API response types matching the backend

export type ApiCategory = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
};

export type ApiCriterion = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  isOfficial: boolean;
  createdByUsername: string | null;
  helpfulCount: number;
  searchCount: number;
};

export type ApiRatingEntry = {
  criterionId: number;
  score: number;
  count: number;
};

export type ApiAiRatingEntry = {
  criterionId: number;
  criterionName: string | null;
  score: number;
  reason: string;
};

export type ApiProduct = {
  id: number;
  categoryId: number;
  name: string;
  brand: string;
  modelNumber: string;
  janCode: string | null;
  price: number;
  description: string | null;
  status: string;
  reviewCount: number;
  images: string[];
  ratings: ApiRatingEntry[];
  aiRatings: ApiAiRatingEntry[];
  amazonAffiliateUrl: string | null;
  asin: string | null;
};

export type AdminProductItem = {
  id: number;
  categoryId: number;
  name: string;
  brand: string;
  modelNumber: string;
  janCode: string | null;
  price: number;
  description: string | null;
  status: string;
  reviewCount: number;
  images: string[];
  amazonAffiliateUrl: string | null;
  asin: string | null;
  createdAt: string;
};

export type CriterionSuggestionItem = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  reason: string | null;
  submitterUsername: string | null;
  submitterEmail?: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
};

export type ProductSuggestionItem = {
  id: number;
  categoryId: number;
  brand: string;
  name: string;
  modelNumber: string;
  janCode: string | null;
  price: number | null;
  description: string | null;
  referenceUrl: string | null;
  images: string[];
  status: string;
  submitterEmail?: string | null;
  adminNotes: string | null;
  createdAt: string;
};

export type CategorySuggestionItem = {
  id: number;
  name: string;
  description: string | null;
  submitterEmail: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
};

export type UserInfo = {
  id: number;
  email: string;
  username: string | null;
};

export type MySubmission = {
  criterionSuggestions: {
    id: number;
    categoryId: number;
    categoryName: string | null;
    name: string;
    description: string;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    helpfulCount: number | null;
  }[];
  productSuggestions: {
    id: number;
    categoryId: number;
    name: string;
    brand: string;
    status: string;
    adminNotes: string | null;
    createdAt: string;
  }[];
};
