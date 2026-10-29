import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
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

  // Prisma 6: findFirst
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
  }

  const mem = await prisma.membership.findFirst({
    where: { userId: user.id },
  });

  const organizationId = mem?.organizationId;

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
