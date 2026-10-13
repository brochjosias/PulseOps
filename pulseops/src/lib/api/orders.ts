'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export type OrderListItem = {
  id: number;
  placedAt: string;
  total: number;
  status: string;
  customerId: number;
  customerName: string;
};

export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderDetail = {
  id: number;
  placedAt: string;
  total: number;
  status: string;
  customerId: number;
  customerName: string;
  customerEmail: string | null;
  items: OrderItem[];
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OrdersListParams = {
  page: number;
  pageSize?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
};

export function useOrders(params: OrdersListParams) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize ?? 20));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  return useQuery<Paged<OrderListItem>>({
    queryKey: ['orders', params],
    queryFn: () => api<Paged<OrderListItem>>(`/api/orders?${qs.toString()}`),
  });
}

export function useOrder(id: number | null) {
  return useQuery<OrderDetail>({
    queryKey: ['orders', 'detail', id],
    queryFn: () => api<OrderDetail>(`/api/orders/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}
