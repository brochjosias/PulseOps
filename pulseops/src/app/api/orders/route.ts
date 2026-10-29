import { prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { orderListQuerySchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = orderListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, status, from, to, search } = parsed.data;

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  // 1) Traz do banco com os filtros iniciais
  const allOrders = await prisma.order.findMany({
    where: {
      organizationId: session.organizationId,
      ...(status ? { status } : {}),
      ...(fromDate || toDate
        ? {
            placedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
  });

  const customerIds = [...new Set(allOrders.map((o) => o.customerId))];
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  // 2) Enriquece com o nome do cliente
  let enriched = allOrders.map((o) => ({
    id: o.id,
    placedAt: o.placedAt,
    total: o.total,
    status: o.status,
    customerId: o.customerId,
    customerName: customerMap.get(o.customerId) ?? '—',
  }));

  // 3) Filtro de busca (se houver)
  if (search) {
    enriched = enriched.filter((o) => o.customerName.toLowerCase().includes(search.toLowerCase()));
  }

  // 4) MÁGICA: Ordena do maior valor para o menor
  enriched.sort((a, b) => b.total - a.total);

  // 5) Paginação
  const total = enriched.length;
  const start = (page - 1) * pageSize;
  const items = enriched.slice(start, start + pageSize);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
