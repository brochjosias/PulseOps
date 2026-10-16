import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'node:crypto';

import { dbRuntime, prisma } from '@/lib/prisma';
import { createRefresh, hashPassword, setAuthCookies, signAccess } from '@/lib/auth';
import { AUDIT } from '@/lib/audit-actions';
import { safeAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  organizationName: z.string().min(2),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  // e-mail já existe?
  const emailPlan = prisma.sql.user
    .select('id')
    .where((f, fns) => fns.eq(f.email, email))
    .limit(1)
    .build();

  const existing = await dbRuntime.query(emailPlan);
  if (existing[0]) {
    return NextResponse.json({ message: 'E-mail já cadastrado' }, { status: 409 });
  }

  // slug único
  const base = slugify(parsed.data.organizationName) || 'org';
  let slug = base;
  let n = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const plan = prisma.sql.organization
      .select('id')
      .where((f, fns) => fns.eq(f.slug, slug))
      .limit(1)
      .build();

    const rows = await dbRuntime.query(plan);
    if (!rows[0]) break;
    slug = `${base}-${n++}`;
  }

  // organization
  const orgPlan = prisma.sql.organization
    .insert([
      {
        id: generateId(),
        name: parsed.data.organizationName,
        slug,
      },
    ])
    .returning('id')
    .build();

  const [org] = await dbRuntime.query(orgPlan);

  // user
  const passwordHash = await hashPassword(parsed.data.password);

  const userPlan = prisma.sql.user
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

  const [user] = await dbRuntime.query(userPlan);

  // membership ADMIN
  const memPlan = prisma.sql.membership
    .insert([
      {
        id: generateId(),
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
      },
    ])
    .build();

  await dbRuntime.execute(memPlan);

  // já loga
  const accessToken = await signAccess(user.id);
  const refresh = await createRefresh(user.id);

  await setAuthCookies(accessToken, refresh.raw, refresh.expiresAt);

  await safeAudit({
    organizationId: org.id,
    userId: user.id,
    action: AUDIT.AUTH_REGISTER,
    entity: 'user',
    entityId: String(user.id),
    metadata: { email, organizationName: parsed.data.organizationName },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
