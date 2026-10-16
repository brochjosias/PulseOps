import { NextResponse } from 'next/server';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, conflict, created, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { listQuerySchema, productCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, search } = parsed.data;

  // 1) Traz todos da org
  const allPlan = prisma.sql.product
    .select('id', 'name', 'sku', 'price', 'active', 'createdAt', 'categoryId')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .orderBy('createdAt', { direction: 'desc' })
    .build();

  const all = await dbRuntime.query(allPlan);

  // 2) Filtra em memória
  const filtered = search
    ? all.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  // 3) Paginação em memória
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

export async function POST(req: Request) {
  const { session, error } = await requireRole('MANAGER');
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const existsPlan = prisma.sql.product
    .select('id')
    .where((f, fns) =>
      fns.and(fns.eq(f.organizationId, session.organizationId), fns.eq(f.sku, parsed.data.sku)),
    )
    .limit(1)
    .build();

  const exists = await dbRuntime.query(existsPlan);
  if (exists[0]) return conflict('SKU já cadastrado nesta organização');

  const insertPlan = prisma.sql.product
    .insert([{ ...parsed.data, organizationId: session.organizationId }])
    .returning('id', 'name', 'sku', 'price', 'active')
    .build();

  const [product] = await dbRuntime.query(insertPlan);

  await safeAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: AUDIT.PRODUCT_CREATE,
    entity: 'product',
    entityId: String(product.id),
    metadata: { name: product.name, sku: product.sku, price: product.price },
  });

  return created(product);
}
