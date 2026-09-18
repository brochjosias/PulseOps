import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbRuntime, prisma } from '@/lib/prisma';
import { createRefresh, setAuthCookies, signAccess, verifyPassword } from '@/lib/auth';

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

  const accessToken = await signAccess(user.id);
  const refresh = await createRefresh(user.id);

  await setAuthCookies(accessToken, refresh.raw, refresh.expiresAt);

  return NextResponse.json({
    ok: true,
  });
}
