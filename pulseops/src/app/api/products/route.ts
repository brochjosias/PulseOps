import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { badRequest, conflict, created, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { listQuerySchema, productCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function GET(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest('Parâmetros inválidos', parsed.error.flatten());

  const { page, pageSize, search } = parsed.data;

  const all = await prisma.product.findMany({
    where: {
      organizationId: session.organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
  });

  all.sort((a, b) => b.price - a.price);

  const total = all.length;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

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

  const exists = await prisma.product.findFirst({
    where: {
      organizationId: session.organizationId,
      sku: parsed.data.sku,
    },
  });
  if (exists) return conflict('SKU já cadastrado nesta organização');

  const product = await prisma.product.create({
    data: {
      id: generateId(), // <-- A CORREÇÃO AQUI
      organizationId: session.organizationId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      price: parsed.data.price,
      active: parsed.data.active ?? 1,
      categoryId: parsed.data.categoryId ?? null,
    } as any,
  });

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
