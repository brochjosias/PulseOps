'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export type AuditLogItem = {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  userId: number | null;
  userEmail: string | null;
  createdAt: string;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useAuditLogs(params: { page: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize ?? 20));

  return useQuery<Paged<AuditLogItem>>({
    queryKey: ['audit-logs', params],
    queryFn: () => api<Paged<AuditLogItem>>(`/api/audit-logs?${qs.toString()}`),
  });
}
