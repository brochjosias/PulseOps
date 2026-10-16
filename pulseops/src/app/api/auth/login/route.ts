import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { createRefresh, setAuthCookies, signAccess, verifyPassword } from '@/lib/auth';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const plan = prisma.sql.user
    .select('id', 'email', 'name', 'passwordHash')
    .where((f, fns) => fns.eq(f.email, email))
    .limit(1)
    .build();

  const users = await dbRuntime.query(plan);
  const user = users[0];

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
  }

  // busca a membership para ter organizationId no audit
  const memPlan = prisma.sql.membership
    .select('organizationId')
    .where((f, fns) => fns.eq(f.userId, user.id))
    .limit(1)
    .build();

  const memRows = await dbRuntime.query(memPlan);
  const organizationId = memRows[0]?.organizationId;

  const accessToken = await signAccess(user.id);
  const refresh = await createRefresh(user.id);

  await setAuthCookies(accessToken, refresh.raw, refresh.expiresAt);

  await safeAudit({
    userId: user.id,
    organizationId,
    action: AUDIT.AUTH_LOGIN,
    entity: 'user',
    entityId: String(user.id),
  });

  return NextResponse.json({
    ok: true,
  });
}
