import { dbRuntime, prisma } from '@/lib/prisma';
import { badRequest, ok, unauthorized, withSession } from '@/lib/http';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { safeAudit } from '@/lib/audit';
import { passwordChangeSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const userPlan = prisma.sql.user
    .select('id', 'passwordHash')
    .where((f, fns) => fns.eq(f.id, session.userId))
    .limit(1)
    .build();

  const [user] = await dbRuntime.query(userPlan);
  if (!user) return unauthorized();

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return badRequest('Senha atual incorreta');
  }

  const hash = await hashPassword(parsed.data.newPassword);

  const updatePlan = prisma.sql.user
    .update({ passwordHash: hash })
    .where((f, fns) => fns.eq(f.id, session.userId))
    .build();

  await dbRuntime.execute(updatePlan);

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'user.change_password',
    entity: 'user',
    entityId: String(session.userId),
  });

  return ok({ ok: true });
}
