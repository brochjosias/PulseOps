import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, notFound, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { membershipUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  const memPlan = prisma.sql.membership
    .select('id', 'userId', 'organizationId')
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.organizationId, session.organizationId)))
    .limit(1)
    .build();

  const [mem] = await dbRuntime.query(memPlan);
  if (!mem) return notFound('Membro não encontrado');

  if (mem.userId === session.userId) {
    return badRequest('Você não pode alterar seu próprio papel');
  }

  const body = await req.json().catch(() => null);
  const parsed = membershipUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const updatePlan = prisma.sql.membership
    .update({ role: parsed.data.role })
    .where((f, fns) => fns.eq(f.id, id))
    .build();

  await dbRuntime.execute(updatePlan);

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

  const memPlan = prisma.sql.membership
    .select('id', 'userId', 'organizationId')
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.organizationId, session.organizationId)))
    .limit(1)
    .build();

  const [mem] = await dbRuntime.query(memPlan);
  if (!mem) return notFound('Membro não encontrado');

  if (mem.userId === session.userId) {
    return badRequest('Você não pode remover a si mesmo');
  }

  const delPlan = prisma.sql.membership
    .delete()
    .where((f, fns) => fns.eq(f.id, id))
    .build();

  await dbRuntime.execute(delPlan);

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'membership.remove',
    entity: 'user',
    entityId: String(mem.userId),
  });

  return ok({ ok: true });
}
