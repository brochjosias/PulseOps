import sqlite from '@prisma/orm-sqlite/runtime';
import type { Contract } from '../../prisma/contract.d';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

export const prisma = sqlite<Contract>({
  contractJson,
  path: './prisma/dev.db',
});

export const dbRuntime = prisma.runtime();
