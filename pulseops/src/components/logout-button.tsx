'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading) return;
    setLoading(true);

    try {
      await api<{ ok: true }>('/api/auth/logout', {
        method: 'POST',
      });

      toast.success('Sessão encerrada');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Não foi possível sair');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Saindo…' : 'Sair'}
    </button>
  );
}
