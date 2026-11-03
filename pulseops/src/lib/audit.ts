import { prisma } from './prisma';
import { randomInt } from 'node:crypto';

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
  await prisma.auditLog.create({
    data: {
      id: generateId(), // <-- AQUI ESTÁ A CORREÇÃO
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    } as any,
  });
}

export async function safeAudit(params: Parameters<typeof audit>[0]) {
  try {
    await audit(params);
  } catch (err) {
    console.error('[audit] falhou', err);
  }
}
