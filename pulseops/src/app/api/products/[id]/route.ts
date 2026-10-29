import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest, conflict, notFound, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { productUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const product = await prisma.product.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!product) return notFound('Produto não encontrado');
  return ok(product);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('MANAGER');
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return notFound('Produto não encontrado');

  const body = await req.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  if (parsed.data.sku && parsed.data.sku !== existing.sku) {
    const dup = await prisma.product.findFirst({
      where: { organizationId: session.organizationId, sku: parsed.data.sku },
    });
    if (dup) return conflict('SKU já cadastrado');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  await safeAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: AUDIT.PRODUCT_UPDATE,
    entity: 'product',
    entityId: String(id),
    metadata: parsed.data,
  });

  return ok(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('MANAGER');
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return notFound('Produto não encontrado');

  await prisma.product.update({ where: { id }, data: { active: 0 } });

  await safeAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: AUDIT.PRODUCT_DEACTIVATE,
    entity: 'product',
    entityId: String(id),
  });

  return ok({ ok: true });
}
