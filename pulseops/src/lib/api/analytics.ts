'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export type CategorySlice = {
  categoryId: number | null;
  categoryName: string;
  revenue: number;
  orders: number;
};

export type ChannelSlice = {
  channelId: number | null;
  channelName: string;
  revenue: number;
  orders: number;
};

export type RegionSlice = {
  regionId: number | null;
  regionName: string;
  uf: string | null;
  revenue: number;
  orders: number;
};

export type AnalyticsResponse = {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  categories: CategorySlice[];
  channels: ChannelSlice[];
  regions: RegionSlice[];
};

export type AnalyticsParams = {
  from?: string;
  to?: string;
};

export function useAnalytics(params: AnalyticsParams) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  return useQuery<AnalyticsResponse>({
    queryKey: ['analytics', params],
    queryFn: () => api<AnalyticsResponse>(`/api/analytics?${qs.toString()}`),
  });
}
