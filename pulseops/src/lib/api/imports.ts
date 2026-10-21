'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type ImportJob = {
  id: string;
  filename: string;
  entity: 'products' | 'customers';
  status: 'queued' | 'processing' | 'done' | 'error';
  processed: number;
  inserted: number;
  skipped: number;
  errors: string[];
  createdAt: number;
};

export function useImports() {
  return useQuery<ImportJob[]>({
    queryKey: ['imports'],
    queryFn: () => api<ImportJob[]>('/api/imports'),
    refetchInterval: (query) => {
      // Se tem algum job rodando, atualiza a cada 1.5s
      const data = query.state.data;
      const hasActive = data?.some((j) => j.status === 'queued' || j.status === 'processing');
      return hasActive ? 1500 : false;
    },
  });
}
