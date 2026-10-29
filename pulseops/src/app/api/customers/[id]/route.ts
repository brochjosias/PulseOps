import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest, notFound, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { customerUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!customer) return notFound('Cliente não encontrado');

  const orders = await prisma.order.findMany({
    where: { customerId: id },
    orderBy: { placedAt: 'desc' },
    select: { id: true, placedAt: true, total: true, status: true },
  });

  return ok({ customer, orders });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('ANALYST');
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await prisma.customer.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return notFound('Cliente não encontrado');

  const body = await req.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email || null;
  if (parsed.data.document !== undefined) patch.document = parsed.data.document || null;

  const updated = await prisma.customer.update({ where: { id }, data: patch });

  await safeAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: AUDIT.CUSTOMER_UPDATE,
    entity: 'customer',
    entityId: String(id),
    metadata: parsed.data,
  });

  return ok(updated);
}
