import { prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { paginationSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize } = parsed.data;

  const items = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const total = await prisma.auditLog.count({
    where: { organizationId: session.organizationId },
  });

  const userIds = [...new Set(items.map((r) => r.userId).filter((v): v is number => v != null))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.email ?? u.name]));

  return ok({
    items: items.map((r) => ({
      ...r,
      userEmail: r.userId != null ? (userMap.get(r.userId) ?? null) : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
