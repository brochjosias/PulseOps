import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, conflict, notFound, ok, withSession } from '@/lib/http';
import { productUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

async function loadProduct(id: number, organizationId: number) {
  const plan = prisma.sql.product
    .select('id', 'name', 'sku', 'price', 'active', 'categoryId', 'createdAt', 'updatedAt')
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

  const product = await loadProduct(id, session.organizationId);
  if (!product) return notFound('Produto não encontrado');

  return ok(product);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await loadProduct(id, session.organizationId);
  if (!existing) return notFound('Produto não encontrado');

  const body = await req.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const newSku = parsed.data.sku;

  if (newSku !== undefined && newSku !== existing.sku) {
    const dupPlan = prisma.sql.product
      .select('id')
      .where((f, fns) =>
        fns.and(fns.eq(f.organizationId, session.organizationId), fns.eq(f.sku, newSku)),
      )
      .limit(1)
      .build();

    const dup = await dbRuntime.query(dupPlan);
    if (dup[0]) return conflict('SKU já cadastrado');
  }

  const updatePlan = prisma.sql.product
    .update(parsed.data)
    .where((f, fns) => fns.eq(f.id, id))
    .build();

  await dbRuntime.execute(updatePlan);

  const updated = await loadProduct(id, session.organizationId);
  return ok(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await loadProduct(id, session.organizationId);
  if (!existing) return notFound('Produto não encontrado');

  const plan = prisma.sql.product
    .update({ active: 0 })
    .where((f, fns) => fns.eq(f.id, id))
    .build();

  await dbRuntime.execute(plan);

  return ok({ ok: true });
}
