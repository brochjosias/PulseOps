'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateMember,
  useMe,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '@/lib/api/settings';

const ROLES = ['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN'] as const;
type Role = (typeof ROLES)[number];

function roleVariant(role: string) {
  if (role === 'ADMIN') return 'success' as const;
  if (role === 'MANAGER') return 'warning' as const;
  if (role === 'ANALYST') return 'secondary' as const;
  return 'outline' as const;
}

export default function MembersPage() {
  const me = useMe();
  const { data, isLoading, isError } = useMembers();
  const create = useCreateMember();
  const updateRole = useUpdateMemberRole();
  const remove = useRemoveMember();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'VIEWER' as Role,
  });

  const canManage = me.data?.role === 'ADMIN';

  async function onCreate() {
    try {
      await create.mutateAsync(form);
      toast.success('Membro adicionado');
      setOpen(false);
      setForm({ email: '', name: '', password: '', role: 'VIEWER' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  function onRoleChange(id: number, role: string) {
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success('Papel atualizado'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
      },
    );
  }

  function onRemove(id: number, email: string) {
    if (!confirm(`Remover ${email} da organização?`)) return;
    remove.mutate(id, {
      onSuccess: () => toast.success('Membro removido'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro'),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title="Membros" description="Quem tem acesso à organização" />
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Adicionar membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo membro</DialogTitle>
                <DialogDescription>Cria um usuário e adiciona à organização.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="m-name">Nome</Label>
                  <Input
                    id="m-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-email">E-mail</Label>
                  <Input
                    id="m-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-password">Senha inicial</Label>
                  <Input
                    id="m-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    O membro poderá alterar depois em /settings/profile.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m-role">Papel</Label>
                  <select
                    id="m-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={onCreate} disabled={create.isPending}>
                    {create.isPending ? 'Adicionando…' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6 text-sm text-destructive">
              Não foi possível carregar os membros.
            </div>
          )}

          {!isLoading && !isError && data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => {
                  const isSelf = m.userId === me.data?.id;

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) => onRoleChange(m.id, e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && !isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(m.id, m.email)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
