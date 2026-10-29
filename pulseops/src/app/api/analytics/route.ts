import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | null, fallback: Date, isEnd = false): Date {
  if (!value || !DATE_RE.test(value)) return fallback;
  const d = new Date(`${value}T${isEnd ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ message: 'Sem organização' }, { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const toFallback = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const fromFallback = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0);

  const to = parseDate(url.searchParams.get('to'), toFallback, true);
  const from = parseDate(url.searchParams.get('from'), fromFallback, false);

  const organizationId = session.organizationId;

  // 1) Pedidos
  const orders = await prisma.order.findMany({
    where: { organizationId, placedAt: { gte: from, lte: to } },
    select: { id: true, total: true, channelId: true, regionId: true },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const orderIds = orders.map((o) => o.id);

  // 2) Itens
  const items = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, productId: true, subtotal: true },
      })
    : [];

  // 3) Produtos e Categorias
  const productIds = [...new Set(items.map((it) => it.productId))];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true },
      })
    : [];

  const productToCategory = new Map<number, number | null>();
  for (const p of products) productToCategory.set(p.id, p.categoryId);

  // 4) Metadados
  const categories = await prisma.category.findMany({ where: { organizationId } });
  const channels = await prisma.salesChannel.findMany({ where: { organizationId } });
  const regions = await prisma.region.findMany({ where: { organizationId } });

  const catName = new Map<number, string>(categories.map((c) => [c.id, c.name]));
  const channelName = new Map<number, string>(channels.map((c) => [c.id, c.name]));
  const regionInfo = new Map<number, { name: string; uf: string | null }>(
    regions.map((r) => [r.id, { name: r.name, uf: r.uf ?? null }]),
  );

  // 5) Agregações
  const categoryMap = new Map<number | null, { revenue: number; orders: number }>();
  for (const it of items) {
    const categoryId = productToCategory.get(it.productId) ?? null;
    const cur = categoryMap.get(categoryId) ?? { revenue: 0, orders: 0 };
    cur.revenue += it.subtotal;
    cur.orders += 1;
    categoryMap.set(categoryId, cur);
  }

  const channelMap = new Map<number | null, { revenue: number; orders: number }>();
  for (const o of orders) {
    const channelId = o.channelId ?? null;
    const cur = channelMap.get(channelId) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    channelMap.set(channelId, cur);
  }

  const regionMap = new Map<number | null, { revenue: number; orders: number }>();
  for (const o of orders) {
    const regionId = o.regionId ?? null;
    const cur = regionMap.get(regionId) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    regionMap.set(regionId, cur);
  }

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue,
    totalOrders,
    categories: [...categoryMap.entries()]
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: categoryId ? (catName.get(categoryId) ?? 'Sem categoria') : 'Sem categoria',
        revenue: v.revenue,
        orders: v.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    channels: [...channelMap.entries()]
      .map(([channelId, v]) => ({
        channelId,
        channelName: channelId ? (channelName.get(channelId) ?? 'Sem canal') : 'Sem canal',
        revenue: v.revenue,
        orders: v.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    regions: [...regionMap.entries()]
      .map(([regionId, v]) => {
        const info = regionId ? regionInfo.get(regionId) : null;
        return {
          regionId,
          regionName: info?.name ?? 'Sem região',
          uf: info?.uf ?? null,
          revenue: v.revenue,
          orders: v.orders,
        };
      })
      .sort((a, b) => b.revenue - a.revenue),
  });
}
