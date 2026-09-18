import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { dbRuntime, prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getSession();

  if (!session?.organizationId) {
    return NextResponse.json({ message: 'Sem organização' }, { status: 401 });
  }

  const url = new URL(req.url);

  const requestedDays = Number(url.searchParams.get('days') ?? '30');

  const days = Math.min(
    Math.max(Number.isFinite(requestedDays) ? Math.floor(requestedDays) : 30, 1),
    365,
  );

  const from = new Date(Date.now() - days * 86_400_000);

  const plan = prisma.sql.order
    .select('placedAt', 'total')
    .where((f, fns) =>
      fns.and(fns.eq(f.organizationId, session.organizationId), fns.gte(f.placedAt, from)),
    )
    .orderBy('placedAt', {
      direction: 'asc',
    })
    .build();

  const orders = await dbRuntime.query(plan);

  const map = new Map<
    string,
    {
      revenue: number;
      orders: number;
    }
  >();

  for (const order of orders) {
    const day = order.placedAt.toISOString().slice(0, 10);

    const current = map.get(day) ?? {
      revenue: 0,
      orders: 0,
    };

    current.revenue += order.total;
    current.orders += 1;

    map.set(day, current);
  }

  return NextResponse.json(
    [...map.entries()].map(([day, value]) => ({
      day,
      ...value,
    })),
  );
}
