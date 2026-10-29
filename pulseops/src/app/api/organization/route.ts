import { prisma } from '@/lib/prisma';
import { badRequest, conflict, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { organizationUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  if (!org) return badRequest('Organização não encontrada');
  return ok(org);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = organizationUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const owner = await prisma.organization.findFirst({ where: { slug: parsed.data.slug } });
  if (owner && owner.id !== session.organizationId) return conflict('Slug já em uso');

  await prisma.organization.update({
    where: { id: session.organizationId },
    data: { name: parsed.data.name, slug: parsed.data.slug },
  });

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'organization.update',
    entity: 'organization',
    entityId: String(session.organizationId),
    metadata: parsed.data,
  });

  return ok({ ok: true });
}
