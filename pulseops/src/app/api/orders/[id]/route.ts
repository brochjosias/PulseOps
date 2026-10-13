import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { notFound, ok, withSession } from '@/lib/http';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = paramsSchema.parse(await ctx.params);

  // Order
  const orderPlan = prisma.sql.order
    .select('id', 'placedAt', 'total', 'status', 'customerId')
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.organizationId, session.organizationId)))
    .limit(1)
    .build();

  const [order] = await dbRuntime.query(orderPlan);
  if (!order) return notFound('Pedido não encontrado');

  // Customer
  const customerPlan = prisma.sql.customer
    .select('id', 'name', 'email')
    .where((f, fns) => fns.eq(f.id, order.customerId))
    .limit(1)
    .build();

  const [customer] = await dbRuntime.query(customerPlan);

  // Items
  const itemsPlan = prisma.sql.orderItem
    .select('id', 'productId', 'quantity', 'unitPrice', 'subtotal')
    .where((f, fns) => fns.eq(f.orderId, id))
    .build();

  const items = await dbRuntime.query(itemsPlan);

  // Nomes dos produtos
  const productIds = [...new Set(items.map((it) => it.productId))];
  const productMap = new Map<number, string>();

  if (productIds.length > 0) {
    const productsPlan = prisma.sql.product
      .select('id', 'name')
      .where((f, fns) => fns.in(f.id, productIds))
      .build();

    const products = await dbRuntime.query(productsPlan);
    for (const p of products) productMap.set(p.id, p.name);
  }

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
