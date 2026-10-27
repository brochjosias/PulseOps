'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { BarChart3, DollarSign, ShoppingCart } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/lib/api/analytics';
import { useChartTheme } from '@/lib/chart-theme';
import { brl } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const BLUE_SCALE = [
  '#3b82f6',
  '#60a5fa',
  '#2563eb',
  '#93c5fd',
  '#1d4ed8',
  '#bfdbfe',
  '#1e40af',
  '#dbeafe',
];

export default function AnalyticsPage() {
  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 86_400_000);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, []);

  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const { data, isLoading, isError } = useAnalytics({ from, to });
  const theme = useChartTheme();

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Análise de vendas por categoria, canal e região" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-40">
            <Label htmlFor="from" className="mb-1.5 block text-xs">
              De
            </Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-40">
            <Label htmlFor="to" className="mb-1.5 block text-xs">
              Até
            </Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar as análises.
        </div>
      )}

      {!isLoading && !isError && data && data.totalOrders === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Sem dados no período"
          description="Ajuste o intervalo de datas para ver as análises."
        />
      )}

      {!isLoading && !isError && data && data.totalOrders > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Faturamento no período</span>
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                  {brl(data.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pedidos no período</span>
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                  {data.totalOrders.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBars data={data.categories} theme={theme} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <ChannelBars data={data.channels} theme={theme} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por Região</CardTitle>
              </CardHeader>
              <CardContent>
                <RegionBars data={data.regions} theme={theme} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Componentes de Gráficos ───────────────────────────────────

// Trocado de Donut para Barras Horizontais
function CategoryBars({
  data,
  theme,
}: {
  data: { categoryName: string; revenue: number }[];
  theme: any;
}) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...theme.tooltip,
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.name}<br/><strong>${brl(p.value)}</strong>`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.gridLine } },
      axisLabel: {
        color: theme.text,
        fontSize: 11,
        formatter: (v: number) => `R$ ${(v / 1000).toFixed(0)}k`,
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.categoryName),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.text, fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.revenue,
          itemStyle: {
            color: BLUE_SCALE[i % BLUE_SCALE.length],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 24,
      },
    ],
  };

  return <ReactECharts style={{ height: 300 }} option={option} />;
}

function ChannelBars({
  data,
  theme,
}: {
  data: { channelName: string; revenue: number }[];
  theme: any;
}) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...theme.tooltip,
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.name}<br/><strong>${brl(p.value)}</strong>`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.gridLine } },
      axisLabel: {
        color: theme.text,
        fontSize: 11,
        formatter: (v: number) => `R$ ${(v / 1000).toFixed(0)}k`,
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.channelName),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.text, fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.revenue,
          itemStyle: {
            color: BLUE_SCALE[i % BLUE_SCALE.length],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 24,
      },
    ],
  };

  return <ReactECharts style={{ height: 280 }} option={option} />;
}

function RegionBars({
  data,
  theme,
}: {
  data: { regionName: string; uf: string | null; revenue: number }[];
  theme: any;
}) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...theme.tooltip,
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.name}<br/><strong>${brl(p.value)}</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => (d.uf ? `${d.regionName} (${d.uf})` : d.regionName)),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: {
        color: theme.text,
        fontSize: 11,
        interval: 0,
        rotate: data.length > 5 ? 25 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.gridLine } },
      axisLabel: {
        color: theme.text,
        fontSize: 11,
        formatter: (v: number) => `R$ ${(v / 1000).toFixed(0)}k`,
      },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.revenue,
          itemStyle: {
            color: BLUE_SCALE[i % BLUE_SCALE.length],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: 32,
      },
    ],
  };

  return <ReactECharts style={{ height: 280 }} option={option} />;
}
