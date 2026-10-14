import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | null, fallback: Date): Date {
  if (!value || !DATE_RE.test(value)) return fallback;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const to = parseDate(url.searchParams.get('to'), new Date());
  const fromDefault = new Date(to.getTime() - 30 * 86_400_000);
  const from = parseDate(url.searchParams.get('from'), fromDefault);

  if (from > to) return badRequest('Intervalo inválido');

  const organizationId = session.organizationId;

  // ── 1) Pedidos do período ────────────────────────────────────
  const ordersPlan = prisma.sql.order
    .select('id', 'total', 'channelId', 'regionId')
    .where((f, fns) =>
      fns.and(
        fns.eq(f.organizationId, organizationId),
        fns.gte(f.placedAt, from),
        fns.lte(f.placedAt, to),
      ),
    )
    .build();

  const orders = await dbRuntime.query(ordersPlan);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;

  const orderIds = orders.map((o) => o.id);

  // ── 2) Itens desses pedidos ──────────────────────────────────
  const itemsPlan = orderIds.length
    ? prisma.sql.orderItem
        .select('orderId', 'productId', 'subtotal')
        .where((f, fns) => fns.in(f.orderId, orderIds))
        .build()
    : null;

  const items = itemsPlan ? await dbRuntime.query(itemsPlan) : [];

  // ── 3) Categorias dos produtos ───────────────────────────────
  const productIds = [...new Set(items.map((it) => it.productId))];

  const productsPlan = productIds.length
    ? prisma.sql.product
        .select('id', 'categoryId')
        .where((f, fns) => fns.in(f.id, productIds))
        .build()
    : null;

  const products = productsPlan ? await dbRuntime.query(productsPlan) : [];

  const productToCategory = new Map<number, number | null>();
  for (const p of products) productToCategory.set(p.id, p.categoryId);

  // ── 4) Metadados (categorias, canais, regiões) ───────────────
  const catsPlan = prisma.sql.category
    .select('id', 'name')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const channelsPlan = prisma.sql.salesChannel
    .select('id', 'name')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const regionsPlan = prisma.sql.region
    .select('id', 'name', 'uf')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const [categories, channels, regions] = await Promise.all([
    dbRuntime.query(catsPlan),
    dbRuntime.query(channelsPlan),
    dbRuntime.query(regionsPlan),
  ]);

  const catName = new Map<number, string>();
  for (const c of categories) catName.set(c.id, c.name);

  const channelName = new Map<number, string>();
  for (const c of channels) channelName.set(c.id, c.name);

  const regionInfo = new Map<number, { name: string; uf: string | null }>();
  for (const r of regions) regionInfo.set(r.id, { name: r.name, uf: r.uf ?? null });

  // ── 5) Agregação por categoria (via itens) ───────────────────
  const categoryMap = new Map<number | null, { revenue: number; orders: number }>();

  for (const it of items) {
    const categoryId = productToCategory.get(it.productId) ?? null;
    const cur = categoryMap.get(categoryId) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(it.subtotal);
    cur.orders += 1;
    categoryMap.set(categoryId, cur);
  }

  const categoriesResult = [...categoryMap.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      categoryName:
        categoryId !== null ? (catName.get(categoryId) ?? 'Sem categoria') : 'Sem categoria',
      revenue: v.revenue,
      orders: v.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── 6) Agregação por canal (via pedidos) ─────────────────────
  const channelMap = new Map<number | null, { revenue: number; orders: number }>();

  for (const o of orders) {
    const channelId = o.channelId ?? null;
    const cur = channelMap.get(channelId) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.total);
    cur.orders += 1;
    channelMap.set(channelId, cur);
  }

  const channelsResult = [...channelMap.entries()]
    .map(([channelId, v]) => ({
      channelId,
      channelName: channelId !== null ? (channelName.get(channelId) ?? 'Sem canal') : 'Sem canal',
      revenue: v.revenue,
      orders: v.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── 7) Agregação por região (via pedidos) ────────────────────
  const regionMap = new Map<number | null, { revenue: number; orders: number }>();

  for (const o of orders) {
    const regionId = o.regionId ?? null;
    const cur = regionMap.get(regionId) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.total);
    cur.orders += 1;
    regionMap.set(regionId, cur);
  }

  const regionsResult = [...regionMap.entries()]
    .map(([regionId, v]) => {
      const info = regionId !== null ? regionInfo.get(regionId) : null;
      return {
        regionId,
        regionName: info?.name ?? 'Sem região',
        uf: info?.uf ?? null,
        revenue: v.revenue,
        orders: v.orders,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return ok({
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue,
    totalOrders,
    categories: categoriesResult,
    channels: channelsResult,
    regions: regionsResult,
  });
}
