import { NextResponse } from 'next/server';

import { withSession } from '@/lib/http';
import { getJob } from '@/lib/queue';

export const runtime = 'nodejs';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession();
  if (error) return error;

  const { id } = await ctx.params;
  const job = getJob(id);

  if (!job || job.organizationId !== session.organizationId) {
    return NextResponse.json({ message: 'Job não encontrado' }, { status: 404 });
  }

  return NextResponse.json(job);
}
