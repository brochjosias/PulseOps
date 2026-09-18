import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { dbRuntime, prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();

  if (!session?.organizationId) {
    return NextResponse.json({ message: 'Sem organização' }, { status: 401 });
  }

  const organizationId = session.organizationId;

  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Pedidos do mês atual
  const currentOrdersPlan = prisma.sql.order
    .select('id', 'total')
    .where((f, fns) =>
      fns.and(fns.eq(f.organizationId, organizationId), fns.gte(f.placedAt, start)),
    )
    .build();

  // Pedidos do mês anterior
  const previousOrdersPlan = prisma.sql.order
    .select('id', 'total')
    .where((f, fns) =>
      fns.and(
        fns.eq(f.organizationId, organizationId),
        fns.gte(f.placedAt, prevStart),
        fns.lt(f.placedAt, start),
      ),
    )
    .build();

  // Clientes da organização
  const customersPlan = prisma.sql.customer
    .select('id')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const [currentOrders, previousOrders, customers] = await Promise.all([
    dbRuntime.query(currentOrdersPlan),
    dbRuntime.query(previousOrdersPlan),
    dbRuntime.query(customersPlan),
  ]);

  const revenue = currentOrders.reduce((sum, order) => sum + order.total, 0);

  const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);

  const orders = currentOrders.length;
  const previousOrderCount = previousOrders.length;

  // Top produtos
  let topProducts: Array<{
    id: number;
    name: string;
    quantity: number;
    revenue: number;
  }> = [];

  const orderIds = currentOrders.map((order) => order.id);

  if (orderIds.length > 0) {
    const topPlan = prisma.sql.orderItem
      .select('productId')
      .select('quantity', (f, fns) => fns.sum(f.quantity))
      .select('revenue', (f, fns) => fns.sum(f.subtotal))
      .where((f, fns) => fns.in(f.orderId, orderIds))
      .groupBy('productId')
      .orderBy('revenue', {
        direction: 'desc',
      })
      .limit(5)
      .build();

    const top = await dbRuntime.query(topPlan);

    const productIds = top.map((item) => item.productId);

    if (productIds.length > 0) {
      const productsPlan = prisma.sql.product
        .select('id', 'name')
        .where((f, fns) => fns.in(f.id, productIds))
        .build();

      const products = await dbRuntime.query(productsPlan);

      topProducts = top.map((item) => ({
        id: item.productId,
        name: products.find((product) => product.id === item.productId)?.name ?? '—',
        quantity: Number(item.quantity ?? 0),
        revenue: Number(item.revenue ?? 0),
      }));
    }
  }

  return NextResponse.json({
    revenue,
    revenueChange: previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0,

    orders,

    ordersChange: previousOrderCount
      ? ((orders - previousOrderCount) / previousOrderCount) * 100
      : 0,

    avgTicket: orders ? revenue / orders : 0,

    customers: customers.length,

    topProducts,
  });
}
