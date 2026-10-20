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
import { brl } from '@/lib/utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const defaults = useMemo(() => {
    const to = new Date();
    // NOVO: Puxa 90 dias para trás por padrão
    const from = new Date(to.getTime() - 90 * 86_400_000);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, []);

  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const { data, isLoading, isError } = useAnalytics({ from, to });

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-[280px] w-full" />
              </CardContent>
            </Card>
          ))}
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={data.categories} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por canal</CardTitle>
              </CardHeader>
              <CardContent>
                <ChannelBars data={data.channels} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Vendas por região</CardTitle>
              </CardHeader>
              <CardContent>
                <RegionBars data={data.regions} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const BLUE_SCALE = [
  '#3b82f6', // azul principal
  '#60a5fa',
  '#2563eb',
  '#93c5fd',
  '#1d4ed8',
  '#bfdbfe',
  '#1e40af',
  '#dbeafe',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#0a0a0a',
  borderColor: '#27272a',
  textStyle: { color: '#fafafa', fontSize: 12 },
};

function CategoryDonut({ data }: { data: { categoryName: string; revenue: number }[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      ...TOOLTIP_STYLE,
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${brl(p.value)} (${p.percent.toFixed(1)}%)`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#a1a1aa', fontSize: 11 },
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#0a0a0a',
          borderWidth: 2,
        },
        label: {
          color: '#fafafa',
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: {
          lineStyle: { color: '#3f3f46' },
        },
        data: data.map((s, i) => ({
          name: s.categoryName,
          value: s.revenue,
          itemStyle: { color: BLUE_SCALE[i % BLUE_SCALE.length] },
        })),
      },
    ],
  };

  return <ReactECharts style={{ height: 320 }} option={option} />;
}
function ChannelBars({ data }: { data: { channelName: string; revenue: number }[] }) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>${brl(p.value)}`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#18181b' } },
      axisLabel: {
        color: '#71717a',
        fontSize: 11,
        formatter: (v: number) => `R$ ${(v / 1000).toFixed(0)}k`,
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.channelName),
      axisLine: { lineStyle: { color: '#27272a' } },
      axisTick: { show: false },
      axisLabel: { color: '#a1a1aa', fontSize: 11 },
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
        barWidth: 18,
      },
    ],
  };

  return <ReactECharts style={{ height: 280 }} option={option} />;
}
function RegionBars({
  data,
}: {
  data: { regionName: string; uf: string | null; revenue: number }[];
}) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>${brl(p.value)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => (d.uf ? `${d.regionName} (${d.uf})` : d.regionName)),
      axisLine: { lineStyle: { color: '#27272a' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        interval: 0,
        rotate: data.length > 6 ? 30 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#18181b' } },
      axisLabel: {
        color: '#71717a',
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
        barWidth: 28,
      },
    ],
  };

  return <ReactECharts style={{ height: 280 }} option={option} />;
}
