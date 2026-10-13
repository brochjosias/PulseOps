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
import { useCreateCustomer } from '@/lib/api/customers';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  document: z.string().max(40, 'Máximo 40 caracteres').or(z.literal('')).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const create = useCreateCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', document: '' },
  });

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync({
        name: data.name,
        email: data.email || undefined,
        document: data.document || undefined,
      });
      toast.success('Cliente criado');
      router.push('/customers');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Novo cliente" description="Preencha os dados abaixo" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <Input id="document" {...register('document')} placeholder="CPF / CNPJ" />
              {errors.document && (
                <p className="text-xs text-destructive">{errors.document.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar cliente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
