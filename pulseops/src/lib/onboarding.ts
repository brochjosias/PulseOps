import { prisma } from '@/lib/prisma';
import { randomInt } from 'node:crypto';

function generateId() {
  return randomInt(1, 2_147_483_647);
}

export async function generateOnboardingData(organizationId: number) {
  try {
    // 1. Canais e Regiões
    const canalOnline = await prisma.salesChannel.create({
      data: { id: generateId(), organizationId, name: 'Online' },
    });
    const canalLoja = await prisma.salesChannel.create({
      data: { id: generateId(), organizationId, name: 'Loja Física' },
    });
    const regSp = await prisma.region.create({
      data: { id: generateId(), organizationId, name: 'São Paulo', uf: 'SP' },
    });
    const regRj = await prisma.region.create({
      data: { id: generateId(), organizationId, name: 'Rio de Janeiro', uf: 'RJ' },
    });

    // 2. Categorias
    const catEletronicos = await prisma.category.create({
      data: { id: generateId(), organizationId, name: 'Eletrônicos' },
    });
    const catVestuario = await prisma.category.create({
      data: { id: generateId(), organizationId, name: 'Vestuário' },
    });

    // 3. Produtos
    const produtosData = [
      {
        name: 'Notebook Pro',
        sku: `NB-${randomInt(100, 999)}`,
        price: 4500,
        categoryId: catEletronicos.id,
      },
      {
        name: 'Smartphone X',
        sku: `SP-${randomInt(100, 999)}`,
        price: 3200,
        categoryId: catEletronicos.id,
      },
      {
        name: 'Camiseta Preta',
        sku: `CS-${randomInt(100, 999)}`,
        price: 89,
        categoryId: catVestuario.id,
      },
      {
        name: 'Mouse Gamer',
        sku: `MS-${randomInt(100, 999)}`,
        price: 250,
        categoryId: catEletronicos.id,
      },
    ];

    const produtos = [];
    for (const p of produtosData) {
      const prod = await prisma.product.create({
        data: {
          id: generateId(),
          organizationId,
          name: p.name,
          sku: p.sku,
          price: p.price,
          active: 1,
          categoryId: p.categoryId,
        },
      });
      produtos.push(prod);
    }

    // 4. Clientes
    const clientes = [];
    for (let i = 1; i <= 5; i++) {
      const cliente = await prisma.customer.create({
        data: {
          id: generateId(),
          organizationId,
          name: `Cliente Exemplo ${i}`,
          email: `exemplo${i}@demo.com`,
        },
      });
      clientes.push(cliente);
    }

    // 5. Criar os Pedidos em Lote (MUITO MAIS RÁPIDO)
    const ordersToCreate = [];
    const orderItemsToCreate = [];

    for (let d = 0; d < 30; d++) {
      const date = new Date(Date.now() - d * 86_400_000);
      const numOrders = randomInt(1, 4);

      for (let i = 0; i < numOrders; i++) {
        const cliente = clientes[randomInt(0, clientes.length)];
        const orderId = generateId();
        const itemCount = randomInt(1, 3);
        let total = 0;

        for (let j = 0; j < itemCount; j++) {
          const p = produtos[randomInt(0, produtos.length)];
          const qty = randomInt(1, 3);
          const subtotal = p.price * qty;
          total += subtotal;

          orderItemsToCreate.push({
            id: generateId(),
            orderId: orderId,
            productId: p.id,
            quantity: qty,
            unitPrice: p.price,
            subtotal,
          });
        }

        ordersToCreate.push({
          id: orderId,
          organizationId,
          customerId: cliente.id,
          channelId: i % 2 === 0 ? canalOnline.id : canalLoja.id,
          regionId: i % 2 === 0 ? regSp.id : regRj.id,
          total,
          status: 'PAID',
          placedAt: date,
        });
      }
    }

    // Insere tudo de uma vez (bulk insert)
    await prisma.order.createMany({ data: ordersToCreate });
    await prisma.orderItem.createMany({ data: orderItemsToCreate });

    console.log(`✅ Dados de onboarding gerados para a org ${organizationId}`);
  } catch (error) {
    console.error('Erro ao gerar dados de onboarding:', error);
  }
}
