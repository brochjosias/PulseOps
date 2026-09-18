import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { dbRuntime, prisma } from './prisma';
import { type Role } from './rbac';

const ACCESS_COOKIE = 'pulseops_access';
const REFRESH_COOKIE = 'pulseops_refresh';

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET não configurado');
  }

  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET não configurado');
  }

  return new TextEncoder().encode(secret);
}

function generateId() {
  return randomInt(1, 2_147_483_647);
}

// ---------- Password ----------
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ---------- Access token ----------
export async function signAccess(userId: number) {
  return new SignJWT({
    sub: String(userId),
  })
    .setProtectedHeader({
      alg: 'HS256',
    })
    .setIssuedAt()
    .setExpirationTime(process.env.ACCESS_TOKEN_TTL ?? '15m')
    .sign(getAccessSecret());
}

export async function verifyAccess(token: string) {
  const { payload } = await jwtVerify(token, getAccessSecret());

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('invalid_user_id');
  }

  return userId;
}

// ---------- Refresh token ----------
function hashRefresh(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function createRefresh(userId: number) {
  const raw = `${randomUUID()}.${randomUUID()}`;

  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7');

  const expiresAt = new Date(Date.now() + days * 86_400_000);

  const plan = prisma.sql.refreshToken
    .insert([
      {
        id: generateId(),
        userId,
        tokenHash: hashRefresh(raw),
        expiresAt,
        createdAt: new Date(),
      },
    ])
    .build();

  await dbRuntime.execute(plan);

  return {
    raw,
    expiresAt,
  };
}

export async function rotateRefresh(raw: string) {
  const hash = hashRefresh(raw);

  const selectPlan = prisma.sql.refreshToken
    .select('id', 'userId', 'expiresAt', 'revokedAt')
    .where((f, fns) => fns.eq(f.tokenHash, hash))
    .limit(1)
    .build();

  const rows = await dbRuntime.query(selectPlan);
  const stored = rows[0];

  // valida sem precisar de userId externo
  if (!stored || stored.revokedAt != null || new Date(stored.expiresAt) < new Date()) {
    throw new Error('refresh_invalid');
  }

  const revokePlan = prisma.sql.refreshToken
    .update({ revokedAt: new Date() })
    .where((f, fns) => fns.eq(f.id, stored.id))
    .build();

  await dbRuntime.execute(revokePlan);

  const refresh = await createRefresh(stored.userId);

  return { userId: stored.userId, refresh };
}

export async function revokeAllRefresh(userId: number) {
  const plan = prisma.sql.refreshToken
    .update({ revokedAt: new Date() })
    .where((f, fns) => fns.eq(f.userId, userId))
    .build();

  await dbRuntime.execute(plan);
}

// ---------- Cookies ----------
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

// ---------- Session ----------
export type Session = {
  userId: number;
  email: string;
  name: string;
  organizationId: number;
  role: Role;
};

export async function getSession(): Promise<Session | null> {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;

  if (!access) {
    return null;
  }

  try {
    const userId = await verifyAccess(access);

    const userPlan = prisma.sql.user
      .select('id', 'email', 'name')
      .where((f, fns) => fns.eq(f.id, userId))
      .limit(1)
      .build();

    const users = await dbRuntime.query(userPlan);
    const user = users[0];

    if (!user) {
      return null;
    }

    const membershipPlan = prisma.sql.membership
      .select('organizationId', 'role')
      .where((f, fns) => fns.eq(f.userId, userId))
      .limit(1)
      .build();

    const memberships = await dbRuntime.query(membershipPlan);

    const membership = memberships[0];

    if (!membership) {
      return null;
    }

    const role = membership.role;

    if (role !== 'VIEWER' && role !== 'ANALYST' && role !== 'MANAGER' && role !== 'ADMIN') {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership.organizationId,
      role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw Object.assign(new Error('Unauthorized'), {
      status: 401,
    });
  }

  return session;
}
