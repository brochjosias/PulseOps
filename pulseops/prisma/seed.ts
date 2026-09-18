import bcrypt from 'bcryptjs';

import { prisma, dbRuntime } from '../src/lib/prisma';

// ─── Organization ─────────────────────────────────────────────
async function getOrCreateOrganization() {
  const findPlan = prisma.sql.organization
    .select('id', 'slug')
    .where((f, fns) => fns.eq(f.slug, 'acme'))
    .limit(1)
    .build();

  const found = await dbRuntime.query(findPlan);
  if (found[0]) return found[0];

  const insertPlan = prisma.sql.organization
    .insert([{ name: 'Acme Corp', slug: 'acme' }])
    .returning('id', 'slug')
    .build();

  const created = await dbRuntime.query(insertPlan);
  return created[0];
}

// ─── User ─────────────────────────────────────────────────────
async function getOrCreateUser(passwordHash: string) {
  const findPlan = prisma.sql.user
    .select('id', 'email')
    .where((f, fns) => fns.eq(f.email, 'admin@pulseops.dev'))
    .limit(1)
    .build();

  const found = await dbRuntime.query(findPlan);
  if (found[0]) return found[0];

  const insertPlan = prisma.sql.user
    .insert([
      {
        email: 'admin@pulseops.dev',
        name: 'Admin',
        passwordHash,
      },
    ])
    .returning('id', 'email')
    .build();

  const created = await dbRuntime.query(insertPlan);
  return created[0];
}

// ─── Membership ───────────────────────────────────────────────
async function ensureMembership(userId: number, organizationId: number) {
  const findPlan = prisma.sql.membership
    .select('id')
    .where((f, fns) => fns.and(fns.eq(f.userId, userId), fns.eq(f.organizationId, organizationId)))
    .limit(1)
    .build();

  const found = await dbRuntime.query(findPlan);
  if (found[0]) return;

  const insertPlan = prisma.sql.membership
    .insert([
      {
        userId,
        organizationId,
        role: 'ADMIN',
      },
    ])
    .build();

  await dbRuntime.query(insertPlan);
}

// ─── Products ─────────────────────────────────────────────────
async function getOrCreateProduct(
  organizationId: number,
  name: string,
  sku: string,
  price: number,
) {
  const findPlan = prisma.sql.product
    .select('id', 'sku', 'price')
    .where((f, fns) => fns.and(fns.eq(f.organizationId, organizationId), fns.eq(f.sku, sku)))
    .limit(1)
    .build();

  const found = await dbRuntime.query(findPlan);
  if (found[0]) return found[0];

  const insertPlan = prisma.sql.product
    .insert([
      {
        organizationId,
        name,
        sku,
        price,
      },
    ])
    .returning('id', 'sku', 'price')
    .build();

  const created = await dbRuntime.query(insertPlan);
  return created[0];
}

async function upsertProducts(organizationId: number) {
  const catalog = [
    { name: 'Notebook Pro', sku: 'NB-001', price: 4500 },
    { name: 'Mouse Gamer', sku: 'MS-002', price: 250 },
    { name: 'Camiseta Preta', sku: 'CS-003', price: 89 },
    { name: 'Cafeteira', sku: 'CF-004', price: 350 },
    { name: 'Smartphone X', sku: 'SP-005', price: 3200 },
  ];

  const products = [];
  for (const p of catalog) {
    const row = await getOrCreateProduct(organizationId, p.name, p.sku, p.price);
    products.push(row);
  }
  return products;
}

// ─── Orders ───────────────────────────────────────────────────
async function hasOrders(organizationId: number) {
  const plan = prisma.sql.order
    .select('id')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .limit(1)
    .build();

  const rows = await dbRuntime.query(plan);
  return rows.length > 0;
}

async function createCustomers(organizationId: number) {
  const payload = Array.from({ length: 20 }).map((_, i) => ({
    organizationId,
    name: `Cliente ${i + 1}`,
    email: `c${i + 1}@demo.dev`,
  }));

  const plan = prisma.sql.customer.insert(payload).returning('id').build();

  return dbRuntime.query(plan);
}

async function createOrders(
  organizationId: number,
  customers: { id: number }[],
  products: { id: number; price: number }[],
) {
  for (let d = 0; d < 90; d++) {
    const date = new Date(Date.now() - d * 86_400_000);
    const n = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < n; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];

      const itemCount = Math.floor(Math.random() * 3) + 1;

      const items = Array.from({ length: itemCount }).map(() => {
        const p = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;

        return {
          productId: p.id,
          quantity: qty,
          unitPrice: Number(p.price),
          subtotal: Number(p.price) * qty,
        };
      });

      const total = items.reduce((s, it) => s + it.subtotal, 0);

      const orderPlan = prisma.sql.order
        .insert([
          {
            organizationId,
            customerId: customer.id,
            total,
            status: 'PAID',
            placedAt: date,
          },
        ])
        .returning('id')
        .build();

      const [order] = await dbRuntime.query(orderPlan);

      const itemPayload = items.map((it) => ({
        orderId: order.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
      }));

      const itemPlan = prisma.sql.orderItem.insert(itemPayload).build();

      await dbRuntime.query(itemPlan);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const org = await getOrCreateOrganization();

  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await getOrCreateUser(passwordHash);

  await ensureMembership(user.id, org.id);

  const products = await upsertProducts(org.id);

  if (await hasOrders(org.id)) {
    console.log('✅ Seed OK (pedidos já existiam) — admin@pulseops.dev / admin123');
    return;
  }

  const customers = await createCustomers(org.id);
  await createOrders(org.id, customers, products);

  console.log('✅ Seed OK — admin@pulseops.dev / admin123');
}

main().catch((err) => {
  console.error('❌ Seed falhou:', err);
  process.exit(1);
});
