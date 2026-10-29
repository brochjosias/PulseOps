import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();

  if (!session?.organizationId) {
    return NextResponse.json({ message: 'Sem organização' }, { status: 401 });
  }

  const organizationId = session.organizationId;

  const now = new Date();
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Prisma 6: findMany e count
  const currentOrders = await prisma.order.findMany({
    where: { organizationId, placedAt: { gte: start } },
    select: { id: true, total: true },
  });

  const previousOrders = await prisma.order.findMany({
    where: { organizationId, placedAt: { gte: prevStart, lt: start } },
    select: { id: true, total: true },
  });

  const customersCount = await prisma.customer.count({
    where: { organizationId },
  });

  const revenue = currentOrders.reduce((sum, order) => sum + order.total, 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);
  const orders = currentOrders.length;
  const previousOrderCount = previousOrders.length;

  let topProducts: Array<{ id: number; name: string; quantity: number; revenue: number }> = [];
  const orderIds = currentOrders.map((order) => order.id);

  if (orderIds.length > 0) {
    // Prisma 6: groupBy
    const top = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { orderId: { in: orderIds } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    const productIds = top.map((item) => item.productId);

    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });

      topProducts = top.map((item) => ({
        id: item.productId,
        name: products.find((p) => p.id === item.productId)?.name ?? '—',
        quantity: Number(item._sum.quantity ?? 0),
        revenue: Number(item._sum.subtotal ?? 0),
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
    customers: customersCount,
    topProducts,
  });
}
