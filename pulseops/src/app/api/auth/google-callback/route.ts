import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { signAccess, createRefresh, setAuthCookies } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Pega a sessão que o NextAuth acabou de criar
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Cria os cookies do PulseOps
  const accessToken = await signAccess(user.id);
  const refresh = await createRefresh(user.id);
  await setAuthCookies(accessToken, refresh.raw, refresh.expiresAt);

  // Manda pro Dashboard
  return NextResponse.redirect(new URL('/dashboard', req.url));
}
