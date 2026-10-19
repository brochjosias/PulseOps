import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { safeAudit } from '@/lib/audit';
import { profileUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;

  const plan = prisma.sql.user
    .select('id', 'email', 'name', 'createdAt')
    .where((f, fns) => fns.eq(f.id, session.userId))
    .limit(1)
    .build();

  const [user] = await dbRuntime.query(plan);
  if (!user) return badRequest('Usuário não encontrado');

  return ok({ ...user, role: session.role });
}

export async function PATCH(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const plan = prisma.sql.user
    .update({ name: parsed.data.name })
    .where((f, fns) => fns.eq(f.id, session.userId))
    .build();

  await dbRuntime.execute(plan);

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'user.update_profile',
    entity: 'user',
    entityId: String(session.userId),
    metadata: { name: parsed.data.name },
  });

  return ok({ ok: true });
}
