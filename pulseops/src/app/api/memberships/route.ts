import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { badRequest, conflict, created, ok, withSession } from '@/lib/http';
import { requireRole } from '@/lib/rbac-guard';
import { safeAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { membershipCreateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function GET() {
  const { session, error } = await withSession();
  if (error) return error;

  const memberships = await prisma.membership.findMany({
    where: { organizationId: session.organizationId },
  });

  const userIds = memberships.map((m) => m.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]));

  return ok(
    memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      email: userMap.get(m.userId)?.email ?? '—',
      name: userMap.get(m.userId)?.name ?? '—',
    })),
  );
}

export async function POST(req: Request) {
  const { session, error } = await requireRole('ADMIN');
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = membershipCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Dados inválidos', parsed.error.flatten());

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({ where: { email } });

  if (existingUser) {
    const existingMem = await prisma.membership.findFirst({
      where: { userId: existingUser.id, organizationId: session.organizationId },
    });
    if (existingMem) return conflict('Este usuário já é membro da organização');
  }

  let userId: number;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { id: generateId(), email, name: parsed.data.name, passwordHash },
    });
    userId = user.id;
  }

  const mem = await prisma.membership.create({
    data: {
      id: generateId(),
      userId,
      organizationId: session.organizationId,
      role: parsed.data.role,
    },
  });

  await safeAudit({
    userId: session.userId,
    organizationId: session.organizationId,
    action: 'membership.create',
    entity: 'user',
    entityId: String(userId),
    metadata: { email, role: parsed.data.role },
  });

  return created({ id: mem.id });
}
