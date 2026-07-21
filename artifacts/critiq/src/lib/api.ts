import type { ApiCategory, ApiCriterion, ApiProduct, AdminProductItem, CriterionSuggestionItem, ProductSuggestionItem } from '@/types/api';

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
  categories: {
    list: () => get<ApiCategory[]>('/categories'),
  },
  criteria: {
    list: (categoryId: number) => get<ApiCriterion[]>(`/categories/${categoryId}/criteria`),
  },
  products: {
    list: (categoryId: number) => get<ApiProduct[]>(`/categories/${categoryId}/products`),
    get: (productId: number) => get<ApiProduct>(`/products/${productId}`),
    submitRating: (productId: number, scores: Record<number, number>) =>
      post<{ ok: boolean }>(`/products/${productId}/ratings`, { scores }),
  },
  suggestions: {
    createCriterion: (data: {
      categoryId: number; name: string; description: string; reason?: string;
    }) => post<{ ok: boolean }>('/criterion-suggestions', data),
    createProduct: (data: {
      categoryId: number; brand: string; name: string; modelNumber?: string;
      janCode?: string; price?: number; description?: string; images?: string[];
    }) => post<{ ok: boolean }>('/product-suggestions', data),
  },
  jan: {
    lookup: (code: string) => get<{ found: boolean; name?: string; brand?: string; description?: string; images?: string[]; lowestPrice?: number | null }>(`/jan/${code}`),
  },

  // ── Admin ────────────────────────────────────────────────
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
    },

    criterionSuggestions: {
      list: (status?: string) =>
        get<CriterionSuggestionItem[]>(`/admin/criterion-suggestions${status ? `?status=${status}` : ''}`),
      review: (id: number, status: 'approved' | 'rejected', adminNotes?: string) =>
        patch<CriterionSuggestionItem>(`/admin/criterion-suggestions/${id}/review`, { status, adminNotes }),
    },

    productSuggestions: {
      list: (status?: string) =>
        get<ProductSuggestionItem[]>(`/admin/product-suggestions${status ? `?status=${status}` : ''}`),
      review: (id: number, status: 'approved' | 'rejected', adminNotes?: string) =>
        patch<ProductSuggestionItem>(`/admin/product-suggestions/${id}/review`, { status, adminNotes }),
    },
  },
};
