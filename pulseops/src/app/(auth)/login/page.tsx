'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { Link } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: FormData) {
    try {
      await api<{ ok: true }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success('Bem-vindo ao PulseOps!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-5 rounded-xl border bg-white p-8 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">PulseOps</h1>

          <p className="text-sm text-slate-500">Entre na sua conta</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            E-mail
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            {...register('email')}
            className="w-full rounded-md border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Senha
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className="w-full rounded-md border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-xs text-slate-500">
          Não tem conta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </form>
    </main>
  );
}
