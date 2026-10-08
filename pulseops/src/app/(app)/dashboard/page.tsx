'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
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

  const loading = overview.isLoading || series.isLoading;
  const error = overview.isError || series.isError || !overview.data;

  const data = overview.data;
  const chart = series.data ?? [];

  const chartOption = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0a0a0a',
      borderColor: '#27272a',
      textStyle: { color: '#fafafa', fontSize: 12 },
    },
    xAxis: {
      type: 'category' as const,
      data: chart.map((c) => c.day),
      axisLine: { lineStyle: { color: '#27272a' } },
      axisLabel: { color: '#71717a', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#18181b' } },
      axisLabel: { color: '#71717a', fontSize: 11 },
    },
    series: [
      {
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.25)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ],
          },
        },
        data: chart.map((c) => c.revenue),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da operação" />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-5 text-sm text-destructive">
            Não foi possível carregar o dashboard.
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Faturamento"
              value={brl(data.revenue)}
              change={data.revenueChange}
              icon={DollarSign}
            />
            <KpiCard
              label="Pedidos"
              value={data.orders.toLocaleString('pt-BR')}
              change={data.ordersChange}
              icon={ShoppingCart}
            />
            <KpiCard label="Ticket médio" value={brl(data.avgTicket)} icon={TrendingUp} />
            <KpiCard label="Clientes" value={data.customers.toLocaleString('pt-BR')} icon={Users} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Faturamento — últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts style={{ height: 320 }} option={chartOption} />
            </CardContent>
          </Card>

          {data.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Produtos mais vendidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {data.topProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-foreground">{p.name}</span>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>{p.quantity} un.</span>
                        <span className="w-24 text-right font-medium text-foreground">
                          {brl(p.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</div>

        {change !== undefined && (
          <div
            className={change >= 0 ? 'mt-1 text-xs text-success' : 'mt-1 text-xs text-destructive'}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%{' '}
            <span className="text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
