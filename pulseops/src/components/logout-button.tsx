'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading) return;
    setLoading(true);

    try {
      await api<{ ok: true }>('/api/auth/logout', { method: 'POST' });
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
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground disabled:opacity-60',
        className,
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>{loading ? 'Saindo…' : 'Sair'}</span>
    </button>
  );
}
