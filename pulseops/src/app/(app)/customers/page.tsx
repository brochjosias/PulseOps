'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Plus } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
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
import { useCustomers } from '@/lib/api/customers';
import { brl } from '@/lib/utils';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useCustomers({ page, search });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Base de clientes da organização"
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus />
              Novo cliente
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Buscar por nome..."
              className="max-w-xs"
            />
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
              Não foi possível carregar os clientes.
            </div>
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Cadastre o primeiro cliente para começar."
              action={
                <Button asChild size="sm">
                  <Link href="/customers/new">
                    <Plus />
                    Novo cliente
                  </Link>
                </Button>
              }
            />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Total gasto</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.document ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.ordersCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(c.totalSpent)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/customers/${c.id}`} aria-label="Ver">
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/customers/${c.id}/edit`} aria-label="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
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
