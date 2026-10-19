import { randomInt } from 'node:crypto';

import { dbRuntime, prisma } from '@/lib/prisma';
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

  const memPlan = prisma.sql.membership
    .select('id', 'userId', 'role', 'createdAt')
    .where((f, fns) => fns.eq(f.organizationId, session.organizationId))
    .build();

  const memberships = await dbRuntime.query(memPlan);

  const userIds = memberships.map((m) => m.userId);
  const userMap = new Map<number, { email: string; name: string }>();

  if (userIds.length > 0) {
    const usersPlan = prisma.sql.user
      .select('id', 'email', 'name')
      .where((f, fns) => fns.in(f.id, userIds))
      .build();

    const users = await dbRuntime.query(usersPlan);
    for (const u of users) userMap.set(u.id, { email: u.email, name: u.name });
  }

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

  const existingUserPlan = prisma.sql.user
    .select('id', 'email')
    .where((f, fns) => fns.eq(f.email, email))
    .limit(1)
    .build();

  const [existingUser] = await dbRuntime.query(existingUserPlan);

  if (existingUser) {
    const memPlan = prisma.sql.membership
      .select('id')
      .where((f, fns) =>
        fns.and(
          fns.eq(f.userId, existingUser.id),
          fns.eq(f.organizationId, session.organizationId),
        ),
      )
      .limit(1)
      .build();

    const existingMem = await dbRuntime.query(memPlan);
    if (existingMem[0]) return conflict('Este usuário já é membro da organização');
  }

  let userId: number;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const passwordHash = await hashPassword(parsed.data.password);

    const insertUserPlan = prisma.sql.user
      .insert([
        {
          id: generateId(),
          email,
          name: parsed.data.name,
          passwordHash,
        },
      ])
      .returning('id')
      .build();

    const [user] = await dbRuntime.query(insertUserPlan);
    userId = user.id;
  }

  const insertMemPlan = prisma.sql.membership
    .insert([
      {
        id: generateId(),
        userId,
        organizationId: session.organizationId,
        role: parsed.data.role,
      },
    ])
    .returning('id')
    .build();

  const [mem] = await dbRuntime.query(insertMemPlan);

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
