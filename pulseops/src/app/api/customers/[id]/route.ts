import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, notFound, ok, withSession } from '@/lib/http';
import { customerUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

async function loadCustomer(id: number, organizationId: number) {
  const plan = prisma.sql.customer
    .select('id', 'name', 'email', 'document', 'createdAt')
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.organizationId, organizationId)))
    .limit(1)
    .build();

  const rows = await dbRuntime.query(plan);
  return rows[0] ?? null;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  const customer = await loadCustomer(id, session.organizationId);
  if (!customer) return notFound('Cliente não encontrado');

  const ordersPlan = prisma.sql.order
    .select('id', 'placedAt', 'total', 'status')
    .where((f, fns) => fns.eq(f.customerId, id))
    .orderBy('placedAt', { direction: 'desc' })
    .build();

  const orders = await dbRuntime.query(ordersPlan);

  return ok({ customer, orders });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await loadCustomer(id, session.organizationId);
  if (!existing) return notFound('Cliente não encontrado');

  const body = await req.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email || null;
  if (parsed.data.document !== undefined) patch.document = parsed.data.document || null;

  const updatePlan = prisma.sql.customer
    .update(patch)
    .where((f, fns) => fns.eq(f.id, id))
    .build();

  await dbRuntime.execute(updatePlan);

  const updated = await loadCustomer(id, session.organizationId);
  return ok(updated);
}
