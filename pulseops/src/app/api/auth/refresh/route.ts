import { NextResponse } from 'next/server';

import { readRefreshCookie, rotateRefresh, setAuthCookies, signAccess } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const raw = await readRefreshCookie();

  if (!raw) {
    return NextResponse.json({ message: 'Sem refresh' }, { status: 401 });
  }

  try {
    const rotated = await rotateRefresh(raw);

    const accessToken = await signAccess(rotated.userId);

    await setAuthCookies(accessToken, rotated.refresh.raw, rotated.refresh.expiresAt);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Refresh inválido' }, { status: 401 });
  }
}
