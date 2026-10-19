'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
import { useMe, useOrganization, useUpdateOrganization } from '@/lib/api/settings';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen'),
});

type FormData = z.infer<typeof schema>;

export default function OrganizationPage() {
  const me = useMe();
  const { data, isLoading, isError } = useOrganization();
  const update = useUpdateOrganization();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (data) reset({ name: data.name, slug: data.slug });
  }, [data, reset]);

  async function onSubmit(values: FormData) {
    try {
      await update.mutateAsync(values);
      toast.success('Organização atualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  const canEdit = me.data?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Organização" description="Dados da empresa" />
      </div>

      {isLoading && <Skeleton className="h-60 w-full" />}
      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar a organização.
        </div>
      )}

      {!isLoading && !isError && data && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...register('name')} disabled={!canEdit} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...register('slug')} disabled={!canEdit} />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                <p className="text-xs text-muted-foreground">
                  Somente letras minúsculas, números e hífen.
                </p>
              </div>

              {!canEdit && (
                <p className="text-xs text-muted-foreground">
                  Apenas ADMINs podem editar a organização.
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!canEdit || isSubmitting}>
                  {isSubmitting ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
