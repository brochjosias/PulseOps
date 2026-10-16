import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

import { prisma, dbRuntime } from '../src/lib/prisma';

function generateId() {
  return randomInt(1, 2_147_483_647);
}

async function main() {
  // 1) Acha a org acme
  const orgPlan = prisma.sql.organization
    .select('id')
    .where((f, fns) => fns.eq(f.slug, 'acme'))
    .limit(1)
    .build();

  const [org] = await dbRuntime.query(orgPlan);
  if (!org) throw new Error('Organização acme não encontrada. Rode pnpm db:seed antes.');

  // 2) Cria (ou acha) o usuário viewer
  const email = 'viewer@pulseops.dev';

  const findUserPlan = prisma.sql.user
    .select('id')
    .where((f, fns) => fns.eq(f.email, email))
    .limit(1)
    .build();

  const existing = await dbRuntime.query(findUserPlan);
  let userId: number;

  if (existing[0]) {
    userId = existing[0].id;
  } else {
    const passwordHash = await bcrypt.hash('viewer123', 10);

    const insertUserPlan = prisma.sql.user
      .insert([
        {
          id: generateId(),
          email,
          name: 'Viewer',
          passwordHash,
        },
      ])
      .returning('id')
      .build();

    const [created] = await dbRuntime.query(insertUserPlan);
    userId = created.id;
  }

  // 3) Membership VIEWER
  const findMemPlan = prisma.sql.membership
    .select('id', 'role')
    .where((f, fns) => fns.and(fns.eq(f.userId, userId), fns.eq(f.organizationId, org.id)))
    .limit(1)
    .build();

  const memRows = await dbRuntime.query(findMemPlan);

  if (memRows[0]) {
    if (memRows[0].role !== 'VIEWER') {
      const upPlan = prisma.sql.membership
        .update({ role: 'VIEWER' })
        .where((f, fns) => fns.eq(f.id, memRows[0].id))
        .build();
      await dbRuntime.execute(upPlan);
    }
  } else {
    const insertMemPlan = prisma.sql.membership
      .insert([
        {
          id: generateId(),
          userId,
          organizationId: org.id,
          role: 'VIEWER',
        },
      ])
      .build();
    await dbRuntime.execute(insertMemPlan);
  }

  console.log('✅ Viewer OK — viewer@pulseops.dev / viewer123 (role VIEWER)');
}

main().catch((err) => {
  console.error('❌ Seed viewer falhou:', err);
  process.exit(1);
});
