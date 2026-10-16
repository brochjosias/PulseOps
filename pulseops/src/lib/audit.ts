import { randomInt } from 'node:crypto';

import { dbRuntime, prisma } from './prisma';

function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function audit(params: {
  organizationId?: number;
  userId?: number;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const plan = prisma.sql.auditLog
    .insert([
      {
        id: generateId(),
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    ])
    .build();

  await dbRuntime.execute(plan);
}

/** Igual a audit(), mas nunca propaga erro. Use em rotas de negócio. */
export async function safeAudit(params: Parameters<typeof audit>[0]) {
  try {
    await audit(params);
  } catch (err) {
    console.error('[audit] falhou', err);
  }
}
