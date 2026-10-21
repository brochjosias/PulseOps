'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useImports } from '@/lib/api/imports';

function StatusBadge({ status }: { status: string }) {
  if (status === 'done')
    return (
      <Badge variant="success">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Concluído
      </Badge>
    );
  if (status === 'error')
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" /> Erro
      </Badge>
    );
  if (status === 'processing')
    return (
      <Badge variant="warning">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Clock className="w-3 h-3 mr-1" /> Na fila
    </Badge>
  );
}

export default function ImportsHistoryPage() {
  const { data, isLoading, isError } = useImports();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Histórico de Importações"
          description="Acompanhe o status dos seus envios de CSV"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!isLoading && !isError && data?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma importação realizada.
            </div>
          )}

          {!isLoading && !isError && data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processados</TableHead>
                  <TableHead className="text-right">Inseridos</TableHead>
                  <TableHead className="text-right">Ignorados</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {job.filename}
                    </TableCell>
                    <TableCell className="capitalize">
                      {job.entity === 'products' ? 'Produtos' : 'Clientes'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{job.processed}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {job.inserted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-warning">
                      {job.skipped}
                    </TableCell>
                    <TableCell
                      className="text-xs text-destructive max-w-[150px] truncate"
                      title={job.errors.join(', ')}
                    >
                      {job.errors.length > 0 ? `${job.errors.length} falhas` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
