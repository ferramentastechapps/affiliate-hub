import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestCoupons() {
  console.log('➕ Adicionando cupons de teste...\n');

  const cupons = [
    {
      code: 'MERCADO10',
      description: '10% de desconto em eletrônicos',
      discount: '10%',
      platform: 'Mercado Livre',
    },
    {
      code: 'MERCADO15',
      description: '15% OFF em compras acima de R$ 100',
      discount: '15%',
      platform: 'mercadolivre',
    },
    {
      code: 'SHOPEE20',
      description: '20% de desconto na primeira compra',
      discount: '20%',
      platform: 'Shopee',
    },
    {
      code: 'SHOPEE5',
      description: 'R$ 5 OFF em qualquer pedido',
      discount: 'R$ 5',
      platform: 'shopee',
    },
    {
      code: 'AMAZON10',
      description: '10% OFF em livros',
      discount: '10%',
      platform: 'Amazon',
    },
    {
      code: 'ALI15',
      description: '15% de desconto em eletrônicos',
      discount: '15%',
      platform: 'AliExpress',
    },
  ];

  for (const cupom of cupons) {
    try {
      const created = await prisma.coupon.create({
        data: {
          code: cupom.code,
          description: cupom.description,
          discount: cupom.discount,
          platform: cupom.platform,
          isActive: true,
        },
      });
      console.log(`✅ Cupom criado: ${created.code} (${created.platform})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Cupom ${cupom.code} já existe`);
      } else {
        console.error(`❌ Erro ao criar ${cupom.code}:`, error.message);
      }
    }
  }

  console.log('\n✅ Cupons de teste adicionados!');
  
  // Verificar total
  const total = await prisma.coupon.count({ where: { isActive: true } });
  console.log(`📊 Total de cupons ativos: ${total}`);

  await prisma.$disconnect();
}

addTestCoupons().catch(console.error);
