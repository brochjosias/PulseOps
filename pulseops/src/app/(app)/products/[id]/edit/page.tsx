'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct, useUpdateProduct } from '@/lib/api/products';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  sku: z.string().min(2, 'Mínimo 2 caracteres'),
  price: z.coerce.number().nonnegative(),
  active: z.coerce.number().int().min(0).max(1),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const productId = Number(id);

  const router = useRouter();
  const { data, isLoading, isError } = useProduct(productId);
  const update = useUpdateProduct(productId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '', price: 0, active: 1 },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        sku: data.sku,
        price: data.price,
        active: data.active,
      });
    }
  }, [data, reset]);

  async function onSubmit(form: FormOutput) {
    try {
      await update.mutateAsync(form);
      toast.success('Produto atualizado');
      router.push('/products');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Produto não encontrado.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Editar produto" description={`ID #${productId}`} />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <select
                id="active"
                {...register('active')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
