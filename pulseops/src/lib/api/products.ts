'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  active: number;
  categoryId: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductsListParams = {
  page: number;
  pageSize?: number;
  search?: string;
};

export function useProducts(params: ProductsListParams) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize ?? 20));
  if (params.search) qs.set('search', params.search);

  return useQuery<Paged<Product>>({
    queryKey: ['products', params],
    queryFn: () => api<Paged<Product>>(`/api/products?${qs.toString()}`),
  });
}

export function useProduct(id: number | null) {
  return useQuery<Product>({
    queryKey: ['products', 'detail', id],
    queryFn: () => api<Product>(`/api/products/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      sku: string;
      price: number;
      active?: number;
      categoryId?: number | null;
    }) =>
      api<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Product>) =>
      api<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<{ ok: true }>(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
