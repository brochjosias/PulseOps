import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest, notFound, ok } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { membershipUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const mem = await prisma.membership.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!mem) return notFound('Membro não encontrado');
  if (mem.userId === session.userId) return badRequest('Você não pode alterar seu próprio papel');

  const body = await req.json().catch(() => null);
  const parsed = membershipUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  await prisma.membership.update({ where: { id }, data: { role: parsed.data.role } });

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'membership.update_role',
    entity: 'user',
    entityId: String(mem.userId),
    metadata: { role: parsed.data.role },
  });

  return ok({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const mem = await prisma.membership.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!mem) return notFound('Membro não encontrado');
  if (mem.userId === session.userId) return badRequest('Você não pode remover a si mesmo');

  await prisma.membership.delete({ where: { id } });

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'membership.remove',
    entity: 'user',
    entityId: String(mem.userId),
  });

  return ok({ ok: true });
}
