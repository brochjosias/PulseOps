'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders } from '@/lib/api/orders';
import { exportToCsv } from '@/lib/csv';
import { brl } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PAID', label: 'Pago' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

function statusVariant(status: string) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'PENDING') return 'warning' as const;
  if (status === 'CANCELLED') return 'destructive' as const;
  return 'outline' as const;
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, isError } = useOrders({
    page,
    search,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  function resetToFirstPage() {
    setPage(1);
  }

  function handleExport() {
    if (!data?.items || data.items.length === 0) {
      toast.error('Nenhum pedido para exportar.');
      return;
    }

    try {
      exportToCsv(data.items, 'pedidos.csv', [
        { key: 'id', label: 'ID' },
        { key: 'placedAt', label: 'Data' },
        { key: 'customerName', label: 'Cliente' },
        { key: 'total', label: 'Total' },
        { key: 'status', label: 'Status' },
      ]);
      toast.success('Exportação concluída!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Histórico de pedidos da organização"
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
            <div className="min-w-[220px] flex-1">
              <Label className="mb-1.5 block text-xs">Cliente</Label>
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  resetToFirstPage();
                }}
                placeholder="Buscar por nome..."
              />
            </div>

            <div className="w-40">
              <Label htmlFor="status" className="mb-1.5 block text-xs">
                Status
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  resetToFirstPage();
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <Label htmlFor="from" className="mb-1.5 block text-xs">
                De
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  resetToFirstPage();
                }}
              />
            </div>

            <div className="w-40">
              <Label htmlFor="to" className="mb-1.5 block text-xs">
                Até
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  resetToFirstPage();
                }}
              />
            </div>

            {(search || status || from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setFrom('');
                  setTo('');
                  setPage(1);
                }}
              >
                <Filter />
                Limpar
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6 text-sm text-destructive">
              Não foi possível carregar os pedidos.
            </div>
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              title="Nenhum pedido encontrado"
              description="Ajuste os filtros ou aguarde novos pedidos."
            />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-muted-foreground">#{o.id}</TableCell>
                      <TableCell className="tabular-nums">
                        {new Date(o.placedAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(o.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.status)}>{statusLabel(o.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/orders/${o.id}`} aria-label="Ver detalhe">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
