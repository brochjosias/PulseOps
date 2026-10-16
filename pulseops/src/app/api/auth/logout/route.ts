import { NextResponse } from 'next/server';

import { clearAuthCookies, readRefreshCookie, revokeAllRefresh, getSession } from '@/lib/auth';
import { safeAudit } from '@/lib/audit';
import { AUDIT } from '@/lib/audit-actions';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSession();
  if (session) await revokeAllRefresh(session.userId);

  if (session) {
    await safeAudit({
      userId: session.userId,
      organizationId: session.organizationId,
      action: AUDIT.AUTH_LOGOUT,
      entity: 'user',
      entityId: String(session.userId),
    });
  }

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
