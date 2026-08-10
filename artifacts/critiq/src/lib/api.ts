import type {
  ApiCategory, ApiCriterion, ApiProduct, AdminProductItem,
  CriterionSuggestionItem, ProductSuggestionItem, CategorySuggestionItem,
  UserInfo, MySubmission, TentDiagnosisAnswers, TentDiagnosisResult,
} from '@/types/api';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `POST ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `PUT ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `PATCH ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

// ── Public ─────────────────────────────────────────────────
export const api = {
  auth: {
    me: () => get<{ ok: boolean; user: UserInfo }>('/auth/me'),
    register: (data: { email: string; username?: string }) =>
      post<{ ok: boolean; user: UserInfo }>('/auth/register', data),
    login: (data: { email: string }) =>
      post<{ ok: boolean; user: UserInfo }>('/auth/login', data),
    logout: () => post<{ ok: boolean }>('/auth/logout'),
  },

  categories: {
    list: () => get<ApiCategory[]>('/categories'),
  },
  criteria: {
    list: (categoryId: number) => get<ApiCriterion[]>(`/categories/${categoryId}/criteria`),
    helpful: (id: number) => post<{ ok: boolean; helpfulCount: number; alreadyVoted?: boolean }>(`/criteria/${id}/helpful`),
    trackSearch: (ids: number[]) => post<{ ok: boolean }>('/criteria/track-search', { ids }),
  },
  products: {
    fetchUrl: (url: string) => post<{ name: string; brand: string; description: string; images: string[]; price: number | null }>('/products/fetch-url', { url }),
    list: (categoryId: number) => get<ApiProduct[]>(`/categories/${categoryId}/products`),
    get: (id: number) => get<ApiProduct>(`/products/${id}`),
    rate: (productId: number, data: { criterionId: number; score: number }) =>
      post<{ ok: boolean }>(`/products/${productId}/ratings`, data),
    submitRating: (productId: number, scores: Record<number, number>, comments?: Record<number, string>) =>
      post<{ ok: boolean; accepted?: number; skipped?: number[] }>(`/products/${productId}/ratings`, {
        scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => (v as number) > 0)),
        comments: comments
          ? Object.fromEntries(Object.entries(comments).filter(([, v]) => (v as string).trim()))
          : undefined,
      }),
    comments: (productId: number) =>
      get<{ id: number; criterionId: number; comment: string; createdAt: string }[]>(`/products/${productId}/comments`),
    myRating: (productId: number) =>
      get<{ ratings: Record<string, number> }>(`/products/${productId}/my-rating`),
  },
  diagnosis: {
    tents: (answers: TentDiagnosisAnswers) =>
      post<{ results: TentDiagnosisResult[]; totalEligible: number }>('/diagnosis/tents', answers),
  },
  upload: {
    image: async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${BASE}/upload/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `Upload failed: ${res.status}`);
      }
      const data = await res.json() as { url: string };
      return data.url;
    },
  },
  suggestions: {
    createCriterion: (data: { categoryId: number; name: string; description: string; reason?: string; submitterUsername?: string }) =>
      post<{ ok: boolean }>('/criterion-suggestions', data),
    createProduct: (data: {
      categoryId: number; brand?: string; name: string; modelNumber?: string;
      janCode?: string; price?: number; description?: string; images?: string[];
      referenceUrl?: string; pendingRatings?: Record<number, number>;
    }) => post<{ ok: boolean }>('/product-suggestions', data),
    createCategory: (data: { name: string; description?: string }) =>
      post<{ ok: boolean }>('/category-suggestions', data),
  },

  user: {
    mySubmissions: () => get<MySubmission>('/user/my-submissions'),
  },

  jan: {
    lookup: (code: string) => get<unknown>(`/jan/lookup/${code}`),
  },

  // ── Admin ───────────────────────────────────────────────
  admin: {
    login: (password: string) => post<{ ok: boolean }>('/admin/login', { password }),
    logout: () => post<{ ok: boolean }>('/admin/logout'),
    me: () => get<{ ok: boolean }>('/admin/me'),

    categories: {
      list: () => get<ApiCategory[]>('/admin/categories'),
      create: (data: { slug: string; name: string; icon: string; sortOrder?: number }) =>
        post<ApiCategory>('/admin/categories', data),
      update: (id: number, data: { slug: string; name: string; icon: string; sortOrder?: number }) =>
        put<ApiCategory>(`/admin/categories/${id}`, data),
      delete: (id: number) => del(`/admin/categories/${id}`),
    },

    criteria: {
      list: (categoryId?: number) =>
        get<ApiCriterion[]>(`/admin/criteria${categoryId ? `?categoryId=${categoryId}` : ''}`),
      create: (data: { categoryId: number; name: string; description?: string; status?: string; sortOrder?: number }) =>
        post<ApiCriterion>('/admin/criteria', data),
      update: (id: number, data: Partial<{ categoryId: number; name: string; description: string; status: string; sortOrder: number }>) =>
        put<ApiCriterion>(`/admin/criteria/${id}`, data),
      delete: (id: number) => del(`/admin/criteria/${id}`),
      applySearchOrder: (categoryId: number) =>
        post<ApiCriterion[]>(`/admin/criteria/apply-search-order?categoryId=${categoryId}`),
    },

    products: {
      list: (params?: { status?: string; categoryId?: number }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
        const q = qs.toString();
        return get<AdminProductItem[]>(`/admin/products${q ? `?${q}` : ''}`);
      },
      create: (data: Partial<AdminProductItem> & { images?: string[] }) =>
        post<AdminProductItem>('/admin/products', data),
      update: (id: number, data: Partial<AdminProductItem> & { images?: string[] }) =>
        put<AdminProductItem>(`/admin/products/${id}`, data),
      updateStatus: (id: number, status: string, adminNotes?: string) =>
        patch<AdminProductItem>(`/admin/products/${id}/status`, { status, adminNotes }),
      delete: (id: number) => del(`/admin/products/${id}`),
      ratings: (id: number) =>
        get<{ criterionId: number; criterionName: string | null; score: number; count: number }[]>(
          `/admin/products/${id}/ratings`,
        ),

      aiRatings: (id: number) =>
        get<{
          id: number;
          productId: number;
          criterionId: number;
          criterionName: string | null;
          score: string;
          reason: string;
          status: 'draft' | 'pending' | 'published';
          published: boolean;
          aiModel: string | null;
          generatedAt: string | null;
          approvedAt: string | null;
          createdAt: string;
          updatedAt: string;
        }[]>(`/admin/products/${id}/ai-ratings`),

      saveAiRatings: (
        id: number,
        ratings: Array<{
          criterionId: number;
          score: number;
          reason: string;
        }>,
      ) =>
        put<{ ok: boolean; saved: number }>(
          `/admin/products/${id}/ai-ratings`,
          { ratings },
        ),

      saveAiRatingsBulk: (
        entries: Array<{
          productId: number;
          criterionId: number;
          score: number;
          reason: string;
        }>,
        publish: boolean,
      ) =>
        put<{
          ok: boolean;
          saved: number;
          products: number;
          published: boolean;
        }>("/admin/products/ai-ratings/bulk", { entries, publish }),

      publishAiRatings: (id: number) =>
        post<{ ok: boolean; published: number }>(
          `/admin/products/${id}/ai-ratings/publish`,
        ),

      unpublishAiRatings: (id: number) =>
        post<{ ok: boolean; unpublished: number }>(
          `/admin/products/${id}/ai-ratings/unpublish`,
        ),
      saveTentDiagnosisBulk: (entries: Array<{ productId: number; specs: Record<string, unknown>; diagnosis: Record<string, unknown> }>) =>
        put<{ ok: boolean; saved: number }>('/admin/tent-diagnosis/bulk', { entries }),
      tentDiagnosis: (id: number) =>
        get<{ specs: Record<string, unknown> | null; diagnosis: Record<string, unknown> | null }>(`/admin/products/${id}/tent-diagnosis`),
    },

    criterionSuggestions: {
      list: (status?: string) =>
        get<CriterionSuggestionItem[]>(`/admin/criterion-suggestions${status ? `?status=${status}` : ''}`),
      review: (id: number, data: { status: 'approved' | 'rejected'; adminNotes?: string; name?: string; description?: string }) =>
        patch<CriterionSuggestionItem>(`/admin/criterion-suggestions/${id}/review`, data),
    },

    productSuggestions: {
      list: (status?: string) =>
        get<ProductSuggestionItem[]>(`/admin/product-suggestions${status ? `?status=${status}` : ''}`),
      review: (id: number, data: {
        status: 'approved' | 'rejected'; adminNotes?: string;
        brand?: string; name?: string; modelNumber?: string;
        janCode?: string; price?: number; description?: string; images?: string[];
      }) => patch<ProductSuggestionItem>(`/admin/product-suggestions/${id}/review`, data),
    },

    categorySuggestions: {
      list: (status?: string) =>
        get<CategorySuggestionItem[]>(`/admin/category-suggestions${status ? `?status=${status}` : ''}`),
      review: (id: number, data: { status: 'approved' | 'rejected'; adminNotes?: string }) =>
        patch<CategorySuggestionItem>(`/admin/category-suggestions/${id}/review`, data),
    },

    users: {
      list: () => get<{ id: number; email: string; username: string | null; createdAt: string }[]>('/admin/users'),
      delete: (id: number) => del(`/admin/users/${id}`),
    },
  },
};
