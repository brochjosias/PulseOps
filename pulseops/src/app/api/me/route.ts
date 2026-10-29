import { prisma } from '@/lib/prisma';
import { badRequest, ok, withSession } from '@/lib/http';
import { safeAudit } from '@/lib/audit';
import { profileUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) return badRequest('Usuário não encontrado');
  return ok({ ...user, role: session.role });
}

export async function PATCH(req: Request) {
  const { session, error } = await withSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  await prisma.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
  });

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
