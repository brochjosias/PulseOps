import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { orderListQuerySchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = orderListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, status, from, to } = parsed.data;

  // 1) Pedidos da org (com filtros de status e período)
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const ordersPlan = prisma.sql.order
    .select('id', 'placedAt', 'total', 'status', 'customerId')
    .where((f, fns) => {
      const conditions = [fns.eq(f.organizationId, session.organizationId)];
      if (status) conditions.push(fns.eq(f.status, status));
      if (fromDate) conditions.push(fns.gte(f.placedAt, fromDate));
      if (toDate) conditions.push(fns.lte(f.placedAt, toDate));

      if (conditions.length === 1) return conditions[0];
      return fns.and(...conditions);
    })
    .orderBy('placedAt', { direction: 'desc' })
    .build();

  const allOrders = await dbRuntime.query(ordersPlan);

  // 2) Nomes dos clientes envolvidos
  const customerIds = [...new Set(allOrders.map((o) => o.customerId))];

  const customerMap = new Map<number, string>();

  if (customerIds.length > 0) {
    const customersPlan = prisma.sql.customer
      .select('id', 'name')
      .where((f, fns) => fns.in(f.id, customerIds))
      .build();

    const customers = await dbRuntime.query(customersPlan);
    for (const c of customers) customerMap.set(c.id, c.name);
  }

  // 3) Enriquece + filtro de busca (por nome de cliente) em memória
  const enriched = allOrders.map((o) => ({
    id: o.id,
    placedAt: o.placedAt,
    total: o.total,
    status: o.status,
    customerId: o.customerId,
    customerName: customerMap.get(o.customerId) ?? '—',
  }));

  const search = parsed.data.search?.trim().toLowerCase();
  const filtered = search
    ? enriched.filter((o) => o.customerName.toLowerCase().includes(search))
    : enriched;

  // 4) Paginação
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
