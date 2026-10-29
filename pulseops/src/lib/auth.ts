import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { prisma } from './prisma';
import { type Role } from './rbac';

const ACCESS_COOKIE = 'pulseops_access';
const REFRESH_COOKIE = 'pulseops_refresh';

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET não configurado');
  return new TextEncoder().encode(secret);
}

function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccess(userId: number) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.ACCESS_TOKEN_TTL ?? '15m')
    .sign(getAccessSecret());
}

export async function verifyAccess(token: string) {
  const { payload } = await jwtVerify(token, getAccessSecret());
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('invalid_user_id');
  return userId;
}

function hashRefresh(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function createRefresh(userId: number) {
  const raw = `${randomUUID()}.${randomUUID()}`;
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7');
  const expiresAt = new Date(Date.now() + days * 86_400_000);

  await prisma.refreshToken.create({
    data: {
      id: generateId(),
      userId,
      tokenHash: hashRefresh(raw),
      expiresAt,
    },
  });

  return { raw, expiresAt };
}

export async function rotateRefresh(raw: string) {
  const hash = hashRefresh(raw);

  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash },
  });

  if (!stored || stored.revokedAt != null || new Date(stored.expiresAt) < new Date()) {
    throw new Error('refresh_invalid');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const refresh = await createRefresh(stored.userId);
  return { userId: stored.userId, refresh };
}

export async function revokeAllRefresh(userId: number) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  });
}

const isProd = process.env.NODE_ENV === 'production';

export async function setAuthCookies(
  accessToken: string,
  refreshRaw: string,
  refreshExpires: Date,
) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 15,
  });
  cookieStore.set(REFRESH_COOKIE, refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    expires: refreshExpires,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function readRefreshCookie() {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export type Session = {
  userId: number;
  email: string;
  name: string;
  organizationId: number;
  role: Role;
};

export async function getSession(): Promise<Session | null> {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return null;

  try {
    const userId = await verifyAccess(access);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const mem = await prisma.membership.findFirst({ where: { userId } });
    if (!mem) return null;

    const role = mem.role;
    if (role !== 'VIEWER' && role !== 'ANALYST' && role !== 'MANAGER' && role !== 'ADMIN')
      return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: mem.organizationId,
      role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return session;
}
