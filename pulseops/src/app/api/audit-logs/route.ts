import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { paginationSchema } from '@/lib/validation';
import { requireRole } from '@/lib/rbac-guard';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;

  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize } = parsed.data;

  const plan = prisma.sql.auditLog
    .select('id', 'action', 'entity', 'entityId', 'userId', 'createdAt')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .orderBy('createdAt', { direction: 'desc' })
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .build();

  const all = await dbRuntime.query(plan);

  // Conta total de forma simples
  const countPlan = prisma.sql.auditLog
    .select('id')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .build();

  const allRows = await dbRuntime.query(countPlan);
  const total = allRows.length;

  // Enriquece com e-mails dos usuários
  const userIds = [...new Set(all.map((r) => r.userId).filter((v): v is number => v != null))];

  const userMap = new Map<number, string>();

  if (userIds.length > 0) {
    const usersPlan = prisma.sql.user
      .select('id', 'email', 'name')
      .where((f, fns) => fns.in(f.id, userIds))
      .build();

    const users = await dbRuntime.query(usersPlan);
    for (const u of users) userMap.set(u.id, u.email ?? u.name);
  }

  return ok({
    items: all.map((r) => ({
      ...r,
      userEmail: r.userId != null ? (userMap.get(r.userId) ?? null) : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
