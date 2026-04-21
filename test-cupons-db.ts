import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCoupons() {
  console.log('🔍 Verificando cupons no banco de dados...\n');
  
  const allCoupons = await prisma.coupon.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      platform: true,
      discount: true,
      expiresAt: true,
    },
  });

  console.log(`📊 Total de cupons ativos: ${allCoupons.length}\n`);

  // Agrupar por plataforma
  const byPlatform: Record<string, number> = {};
  allCoupons.forEach(c => {
    const p = c.platform.toLowerCase();
    byPlatform[p] = (byPlatform[p] || 0) + 1;
  });

  console.log('📦 Cupons por plataforma:');
  Object.entries(byPlatform)
    .sort((a, b) => b[1] - a[1])
    .forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count} cupons`);
    });

  console.log('\n🔍 Cupons do Mercado Livre:');
  const mercadoLivreCoupons = allCoupons.filter(c => 
    c.platform.toLowerCase().includes('mercado')
  );
  mercadoLivreCoupons.forEach(c => {
    console.log(`  - ${c.code} (${c.discount}) - Plataforma: "${c.platform}"`);
  });

  console.log('\n🔍 Cupons da Shopee:');
  const shopeeCoupons = allCoupons.filter(c => 
    c.platform.toLowerCase().includes('shopee')
  );
  shopeeCoupons.forEach(c => {
    console.log(`  - ${c.code} (${c.discount}) - Plataforma: "${c.platform}"`);
  });

  await prisma.$disconnect();
}

testCoupons().catch(console.error);
