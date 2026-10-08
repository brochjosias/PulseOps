'use client';

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
import { useCreateProduct } from '@/lib/api/products';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  sku: z.string().min(2, 'Mínimo 2 caracteres'),
  price: z.coerce.number().nonnegative('Preço inválido'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function NewProductPage() {
  const router = useRouter();
  const create = useCreateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '', price: 0 },
  });

  async function onSubmit(data: FormOutput) {
    try {
      await create.mutateAsync(data);
      toast.success('Produto criado');
      router.push('/products');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Novo produto" description="Preencha os dados abaixo" />

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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar produto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
