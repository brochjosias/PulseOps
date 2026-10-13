'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export type Customer = {
  id: number;
  name: string;
  email: string | null;
  document: string | null;
  createdAt?: string;
};

export type CustomerWithStats = Customer & {
  ordersCount: number;
  totalSpent: number;
};

export type CustomerOrder = {
  id: number;
  placedAt: string;
  total: number;
  status: string;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CustomersListParams = {
  page: number;
  pageSize?: number;
  search?: string;
};

export function useCustomers(params: CustomersListParams) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize ?? 20));
  if (params.search) qs.set('search', params.search);

  return useQuery<Paged<CustomerWithStats>>({
    queryKey: ['customers', params],
    queryFn: () => api<Paged<CustomerWithStats>>(`/api/customers?${qs.toString()}`),
  });
}

export function useCustomer(id: number | null) {
  return useQuery<{
    customer: Customer;
    orders: CustomerOrder[];
  }>({
    queryKey: ['customers', 'detail', id],
    queryFn: () => api<{ customer: Customer; orders: CustomerOrder[] }>(`/api/customers/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email?: string; document?: string }) =>
      api<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; email?: string; document?: string }) =>
      api<Customer>(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
