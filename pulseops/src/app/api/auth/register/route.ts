import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createRefresh, hashPassword, setAuthCookies, signAccess } from '@/lib/auth';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';
import { randomInt } from 'node:crypto';
import { generateOnboardingData } from '@/lib/onboarding';

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
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return NextResponse.json({ message: 'E-mail já cadastrado' }, { status: 409 });

  const base = slugify(parsed.data.organizationName) || 'org';
  let slug = base;
  let n = 1;
  while (await prisma.organization.findFirst({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const org = await prisma.organization.create({
    data: { id: generateId(), name: parsed.data.organizationName, slug },
  });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { id: generateId(), email, name: parsed.data.name, passwordHash },
  });

  await prisma.membership.create({
    data: { id: generateId(), userId: user.id, organizationId: org.id, role: 'ADMIN' },
  });

  generateOnboardingData(org.id);

  await safeAudit({
    organizationId: org.id,
    userId: user.id,
    action: AUDIT.AUTH_REGISTER,
    entity: 'user',
    entityId: String(user.id),
    metadata: { email, organizationName: parsed.data.organizationName },
  });

  const accessToken = await signAccess(user.id);
  const refresh = await createRefresh(user.id);
  await setAuthCookies(accessToken, refresh.raw, refresh.expiresAt);

  return NextResponse.json({ ok: true }, { status: 201 });
}
