'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/lib/api/audit';

function actionVariant(action: string) {
  if (action.startsWith('auth.')) return 'secondary' as const;
  if (action.includes('create') || action.includes('register')) return 'success' as const;
  if (action.includes('update') || action.includes('login')) return 'warning' as const;
  if (action.includes('deactivate') || action.includes('logout')) return 'destructive' as const;
  return 'outline' as const;
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAuditLogs({ page });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Auditoria" description="Registro de ações sensíveis da organização" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6 text-sm text-destructive">Não foi possível carregar o log.</div>
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              title="Sem registros"
              description="Nenhuma ação sensível foi registrada ainda."
            />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{log.userEmail ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.entity ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{log.entityId ?? '—'}</TableCell>
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
