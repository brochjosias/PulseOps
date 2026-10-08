import { NextResponse } from 'next/server';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, conflict, created, ok, withSession } from '@/lib/http';
import { listQuerySchema, productCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, search } = parsed.data;

  // 1) traz todos da org (select completo)
  const allPlan = prisma.sql.product
    .select('id', 'name', 'sku', 'price', 'active', 'createdAt', 'categoryId')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .orderBy('createdAt', { direction: 'desc' })
    .build();

  const all = await dbRuntime.query(allPlan);

  // 2) filtra em memória
  const filtered = search
    ? all.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  // 3) pagina em memória
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
