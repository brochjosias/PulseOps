import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, conflict, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { organizationUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;

  const plan = prisma.sql.organization
    .select('id', 'name', 'slug', 'createdAt')
    .where((f, fns) => fns.eq(f.id, session.organizationId))
    .limit(1)
    .build();

  const [org] = await dbRuntime.query(plan);
  if (!org) return badRequest('Organização não encontrada');

  return ok(org);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = organizationUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  // slug único
  // slug único (checagem em memória — fns.neq não existe nesse runtime)
  const ownerPlan = prisma.sql.organization
    .select('id')
    .where((f, fns) => fns.eq(f.slug, parsed.data.slug))
    .limit(1)
    .build();

  const [owner] = await dbRuntime.query(ownerPlan);
  if (owner && owner.id !== session.organizationId) {
    return conflict('Slug já em uso');
  }

  const updatePlan = prisma.sql.organization
    .update({ name: parsed.data.name, slug: parsed.data.slug })
    .where((f, fns) => fns.eq(f.id, session.organizationId))
    .build();

  await dbRuntime.execute(updatePlan);

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
