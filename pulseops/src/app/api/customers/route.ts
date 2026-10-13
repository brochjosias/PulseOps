import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, created, ok, withSession } from '@/lib/http';
import { customerCreateSchema, paginationSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, search } = parsed.data;

  const allPlan = prisma.sql.customer
    .select('id', 'name', 'email', 'document', 'createdAt')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .orderBy('name', { direction: 'asc' })
    .build();

  const all = await dbRuntime.query(allPlan);

  const filtered = search
    ? all.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  // Agregações por cliente
  const ids = filtered.map((c) => c.id);

  const stats = new Map<number, { ordersCount: number; totalSpent: number }>();

  if (ids.length > 0) {
    const ordersPlan = prisma.sql.order
      .select('customerId', 'total')
      .where((f, fns) => fns.in(f.customerId, ids))
      .build();

    const orders = await dbRuntime.query(ordersPlan);

    for (const o of orders) {
      const cur = stats.get(o.customerId) ?? { ordersCount: 0, totalSpent: 0 };
      cur.ordersCount += 1;
      cur.totalSpent += Number(o.total);
      stats.set(o.customerId, cur);
    }
  }

  const enriched = filtered.map((c) => ({
    ...c,
    ordersCount: stats.get(c.id)?.ordersCount ?? 0,
    totalSpent: stats.get(c.id)?.totalSpent ?? 0,
  }));

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

export async function POST(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const insertPlan = prisma.sql.customer
    .insert([
      {
        organizationId: session.organizationId,
        name: parsed.data.name,
        email: parsed.data.email || null,
        document: parsed.data.document || null,
      },
    ])
    .returning('id', 'name', 'email', 'document')
    .build();

  const [customer] = await dbRuntime.query(insertPlan);

  return created(customer);
}
