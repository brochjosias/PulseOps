'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

import { api } from '@/lib/api-client';
import { brl } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

type TopProduct = {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
};

type OverviewResponse = {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  avgTicket: number;
  customers: number;
  topProducts: TopProduct[];
};

type TimeseriesPoint = {
  day: string;
  revenue: number;
  orders: number;
};

export default function DashboardPage() {
  const overview = useQuery<OverviewResponse>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api<OverviewResponse>('/api/dashboard/overview'),
  });

  const series = useQuery<TimeseriesPoint[]>({
    queryKey: ['dashboard', 'timeseries', 30],
    queryFn: () => api<TimeseriesPoint[]>('/api/dashboard/timeseries?days=30'),
  });

  if (overview.isLoading || series.isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <p className="text-sm text-slate-500">Carregando dashboard...</p>
      </div>
    );
  }

  if (overview.isError || series.isError || !overview.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar o dashboard.
      </div>
    );
  }

  const data = overview.data;
  const chart = series.data ?? [];

  const kpis = [
    {
      label: 'Faturamento',
      value: brl(data.revenue),
      change: data.revenueChange,
      icon: DollarSign,
    },
    {
      label: 'Pedidos',
      value: data.orders.toLocaleString('pt-BR'),
      change: data.ordersChange,
      icon: ShoppingCart,
    },
    {
      label: 'Ticket médio',
      value: brl(data.avgTicket),
      icon: TrendingUp,
    },
    {
      label: 'Clientes',
      value: data.customers.toLocaleString('pt-BR'),
      icon: Users,
    },
  ];

  const chartOption = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category' as const,
      data: chart.map((item) => item.day),
    },
    yAxis: {
      type: 'value' as const,
    },
    series: [
      {
        type: 'line' as const,
        smooth: true,
        areaStyle: {},
        data: chart.map((item) => item.revenue),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

        <p className="mt-1 text-sm text-slate-500">Visão geral da operação</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, change, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{label}</span>

              <Icon className="h-4 w-4" />
            </div>

            <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>

            {change !== undefined && (
              <div
                className={
                  change >= 0 ? 'mt-1 text-xs text-emerald-600' : 'mt-1 text-xs text-red-600'
                }
              >
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% vs. mês anterior
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-medium text-slate-900">Faturamento — últimos 30 dias</h2>

        <ReactECharts style={{ height: 320 }} option={chartOption} />
      </div>
    </div>
  );
}
