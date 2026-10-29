import { prisma } from '@/lib/prisma';
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) return unauthorized();
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return badRequest('Senha atual incorreta');
  }

  const hash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash: hash } });

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'user.change_password',
    entity: 'user',
    entityId: String(session.userId),
  });

  return ok({ ok: true });
}
