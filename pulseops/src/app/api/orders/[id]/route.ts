import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notFound, ok, withSession } from '@/lib/http';

export const runtime = 'nodejs';
const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;
  const { id } = paramsSchema.parse(await ctx.params);

  const order = await prisma.order.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!order) return notFound('Pedido não encontrado');

  const customer = await prisma.customer.findUnique({
    where: { id: order.customerId },
    select: { id: true, name: true, email: true },
  });

  const items = await prisma.orderItem.findMany({
    where: { orderId: id },
  });

  const productIds = [...new Set(items.map((it) => it.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return ok({
    id: order.id,
    placedAt: order.placedAt,
    total: order.total,
    status: order.status,
    customerId: order.customerId,
    customerName: customer?.name ?? '—',
    customerEmail: customer?.email ?? null,
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: productMap.get(it.productId) ?? '—',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
    })),
  });
}
