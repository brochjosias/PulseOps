import { NextResponse } from 'next/server';

import { clearAuthCookies, readRefreshCookie, revokeAllRefresh, getSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSession();
  if (session) await revokeAllRefresh(session.userId);

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
