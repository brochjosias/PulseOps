import { prisma } from './prisma';

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
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    } as any, // <-- ADICIONE ISSO
  });
}

export async function safeAudit(params: Parameters<typeof audit>[0]) {
  try {
    await audit(params);
  } catch (err) {
    console.error('[audit] falhou', err);
  }
}
