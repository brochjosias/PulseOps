import { prisma } from '@/lib/prisma';
import { badRequest, created, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { customerCreateSchema, paginationSchema } from '@/lib/validation';
import { randomInt } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, search } = parsed.data;

  // 1) Traz todos
  const all = await prisma.customer.findMany({
    where: {
      organizationId: session.organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' }, // Mantém a ordenação padrão por nome
  });

  const ids = all.map((c) => c.id);
  const orders = ids.length
    ? await prisma.order.findMany({
        where: { customerId: { in: ids } },
        select: { customerId: true, total: true },
      })
    : [];

  // 2) Calcula os totais
  const stats = new Map<number, { ordersCount: number; totalSpent: number }>();
  for (const o of orders) {
    const cur = stats.get(o.customerId) ?? { ordersCount: 0, totalSpent: 0 };
    cur.ordersCount += 1;
    cur.totalSpent += o.total;
    stats.set(o.customerId, cur);
  }

  const enriched = all.map((c) => ({
    ...c,
    ordersCount: stats.get(c.id)?.ordersCount ?? 0,
    totalSpent: stats.get(c.id)?.totalSpent ?? 0,
  }));

  // 3) A MÁGICA ACONTECE AQUI: Ordena pelo Total Gasto (decrescente)
  enriched.sort((a, b) => b.totalSpent - a.totalSpent);

  // 4) Paginação
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
  const { session, error } = await requireRole('ANALYST');
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const customer = await prisma.customer.create({
    data: {
      id: randomInt(1, 2_147_483_647), // <-- A CORREÇÃO AQUI
      organizationId: session.organizationId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      document: parsed.data.document || null,
    } as any,
  });

  await safeAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: AUDIT.CUSTOMER_CREATE,
    entity: 'customer',
    entityId: String(customer.id),
    metadata: { name: customer.name, email: customer.email },
  });

  return created(customer);
}
