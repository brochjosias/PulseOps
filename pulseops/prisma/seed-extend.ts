import { dbRuntime, prisma } from '../src/lib/prisma';

// ─── Helpers ──────────────────────────────────────────────────
type Row = Record<string, any>;

async function findOrganization() {
  const plan = prisma.sql.organization
    .select('id', 'slug')
    .where((f, fns) => fns.eq(f.slug, 'acme'))
    .limit(1)
    .build();

  const [org] = await dbRuntime.query(plan);
  if (!org) throw new Error('Organização acme não encontrada. Rode pnpm db:seed primeiro.');
  return org;
}

// ─── Categorias ───────────────────────────────────────────────
async function ensureCategory(organizationId: number, name: string) {
  const find = prisma.sql.category
    .select('id', 'name')
    .where((f, fns) => fns.and(fns.eq(f.organizationId, organizationId), fns.eq(f.name, name)))
    .limit(1)
    .build();

  const found = await dbRuntime.query(find);
  if (found[0]) return found[0];

  const insert = prisma.sql.category
    .insert([{ organizationId, name }])
    .returning('id', 'name')
    .build();

  const [created] = await dbRuntime.query(insert);
  return created;
}

// ─── Canais ───────────────────────────────────────────────────
async function ensureChannel(organizationId: number, name: string) {
  const find = prisma.sql.salesChannel
    .select('id', 'name')
    .where((f, fns) => fns.and(fns.eq(f.organizationId, organizationId), fns.eq(f.name, name)))
    .limit(1)
    .build();

  const found = await dbRuntime.query(find);
  if (found[0]) return found[0];

  const insert = prisma.sql.salesChannel
    .insert([{ organizationId, name }])
    .returning('id', 'name')
    .build();

  const [created] = await dbRuntime.query(insert);
  return created;
}

// ─── Regiões ──────────────────────────────────────────────────
async function ensureRegion(organizationId: number, name: string, uf: string) {
  const find = prisma.sql.region
    .select('id', 'name', 'uf')
    .where((f, fns) => fns.and(fns.eq(f.organizationId, organizationId), fns.eq(f.name, name)))
    .limit(1)
    .build();

  const found = await dbRuntime.query(find);
  if (found[0]) return found[0];

  const insert = prisma.sql.region
    .insert([{ organizationId, name, uf }])
    .returning('id', 'name', 'uf')
    .build();

  const [created] = await dbRuntime.query(insert);
  return created;
}

// ─── Vincula produtos → categorias ────────────────────────────
async function linkProductsToCategories(organizationId: number, catMap: Record<string, Row>) {
  const bySku: Record<string, number> = {
    'NB-001': catMap['Eletrônicos'].id, // Notebook
    'MS-002': catMap['Periféricos'].id, // Mouse
    'CS-003': catMap['Vestuário'].id, // Camiseta
    'CF-004': catMap['Eletrodomésticos'].id, // Cafeteira
    'SP-005': catMap['Eletrônicos'].id, // Smartphone
  };

  const productsPlan = prisma.sql.product
    .select('id', 'sku', 'categoryId')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const products = await dbRuntime.query(productsPlan);

  let updated = 0;
  for (const p of products) {
    const targetCat = bySku[p.sku];
    if (!targetCat) continue;
    if (p.categoryId === targetCat) continue;

    const update = prisma.sql.product
      .update({ categoryId: targetCat })
      .where((f, fns) => fns.eq(f.id, p.id))
      .build();

    await dbRuntime.execute(update);
    updated += 1;
  }

  return updated;
}

// ─── Vincula pedidos → canais + regiões ──────────────────────
async function linkOrdersToChannelAndRegion(
  organizationId: number,
  channels: Row[],
  regions: Row[],
) {
  const ordersPlan = prisma.sql.order
    .select('id', 'channelId', 'regionId')
    .where((f, fns) => fns.eq(f.organizationId, organizationId))
    .build();

  const orders = await dbRuntime.query(ordersPlan);

  // pesos por canal (mais online que físico)
  const channelWeights: { id: number; w: number }[] = [
    { id: channels[0].id, w: 0.25 }, // Loja Física
    { id: channels[1].id, w: 0.5 }, // Online
    { id: channels[2].id, w: 0.25 }, // Marketplace
  ];

  const regionWeights: { id: number; w: number }[] = [
    { id: regions[0].id, w: 0.4 }, // SP
    { id: regions[1].id, w: 0.25 }, // RJ
    { id: regions[2].id, w: 0.2 }, // MG
    { id: regions[3].id, w: 0.15 }, // RS
  ];

  function pick<T extends { id: number; w: number }>(arr: T[]) {
    const r = Math.random();
    let acc = 0;
    for (const item of arr) {
      acc += item.w;
      if (r <= acc) return item.id;
    }
    return arr[arr.length - 1].id;
  }

  let updated = 0;
  for (const o of orders) {
    if (o.channelId != null && o.regionId != null) continue;

    const patch: Record<string, number> = {};
    if (o.channelId == null) patch.channelId = pick(channelWeights);
    if (o.regionId == null) patch.regionId = pick(regionWeights);

    if (Object.keys(patch).length === 0) continue;

    const update = prisma.sql.order
      .update(patch)
      .where((f, fns) => fns.eq(f.id, o.id))
      .build();

    await dbRuntime.execute(update);
    updated += 1;
  }

  return updated;
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const org = await findOrganization();

  // 1) Categorias
  const catNames = ['Eletrônicos', 'Periféricos', 'Vestuário', 'Eletrodomésticos'];
  const catMap: Record<string, Row> = {};
  for (const name of catNames) {
    catMap[name] = await ensureCategory(org.id, name);
  }

  // 2) Canais
  const channelNames = ['Loja Física', 'Online', 'Marketplace'];
  const channels: Row[] = [];
  for (const name of channelNames) {
    channels.push(await ensureChannel(org.id, name));
  }

  // 3) Regiões
  const regionDefs = [
    { name: 'São Paulo', uf: 'SP' },
    { name: 'Rio de Janeiro', uf: 'RJ' },
    { name: 'Minas Gerais', uf: 'MG' },
    { name: 'Rio Grande do Sul', uf: 'RS' },
  ];
  const regions: Row[] = [];
  for (const def of regionDefs) {
    regions.push(await ensureRegion(org.id, def.name, def.uf));
  }

  // 4) Vincular produtos → categorias
  const productsUpdated = await linkProductsToCategories(org.id, catMap);

  // 5) Vincular pedidos → canal + região
  const ordersUpdated = await linkOrdersToChannelAndRegion(org.id, channels, regions);

  console.log('✅ Seed estendido:');
  console.log(`   categorias: ${Object.keys(catMap).length}`);
  console.log(`   canais: ${channels.length}`);
  console.log(`   regiões: ${regions.length}`);
  console.log(`   produtos atualizados: ${productsUpdated}`);
  console.log(`   pedidos atualizados: ${ordersUpdated}`);
}

main().catch((err) => {
  console.error('❌ Seed estendido falhou:', err);
  process.exit(1);
});
