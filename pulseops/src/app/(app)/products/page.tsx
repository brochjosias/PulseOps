'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';

import { Skeleton } from '@/components/ui/skeleton';
import { ImportModal } from '@/components/ui/import-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { exportToCsv } from '@/lib/csv';
import { brl } from '@/lib/utils';
import { useDeleteProduct, useProducts } from '@/lib/api/products';
import { useImports } from '@/lib/api/imports';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useProducts({ page, search });
  const remove = useDeleteProduct();

  // Usado apenas para atualizar o cache global de histórico quando terminar um upload
  const { refetch: refetchImports } = useImports();

  function onDelete(id: number, name: string) {
    if (!confirm(`Desativar o produto "${name}"?`)) return;

    remove.mutate(id, {
      onSuccess: () => toast.success('Produto desativado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
    });
  }

  function handleImportSuccess() {
    refetch(); // Recarrega a lista de produtos
    refetchImports(); // Recarrega o histórico de importação
  }

  function handleExport() {
    if (!data?.items || data.items.length === 0) {
      toast.error('Nenhum produto para exportar.');
      return;
    }

    try {
      exportToCsv(data.items, 'produtos.csv', [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nome' },
        { key: 'sku', label: 'SKU' },
        { key: 'price', label: 'Preço' },
        { key: 'active', label: 'Ativo (1/0)' },
      ]);
      toast.success('Exportação concluída!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Catálogo da organização"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus />
                Novo produto
              </Link>
            </Button>
          </div>
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6 text-sm text-destructive">
              Não foi possível carregar os produtos.
            </div>
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              title="Nenhum produto cadastrado"
              description="Crie o primeiro produto ou importe um arquivo CSV."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <Upload /> Importar CSV
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/products/new">
                      <Plus /> Novo produto
                    </Link>
                  </Button>
                </div>
              }
            />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(p.price)}</TableCell>
                      <TableCell>
                        {p.active === 1 ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/products/${p.id}/edit`} aria-label="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(p.id, p.name)}
                            aria-label="Desativar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="products"
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
