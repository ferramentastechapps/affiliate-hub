const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  console.log('=== LAST 5 ACTIVE PRODUCTS IN DATABASE ===');
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  if (products.length === 0) {
    console.log('Nenhum produto ativo encontrado.');
  } else {
    products.forEach((prod, i) => {
      console.log(`[Product ${i + 1}]`);
      console.log(`  ID: ${prod.id}`);
      console.log(`  Name: ${prod.name}`);
      console.log(`  ImageUrl (Site): ${prod.imageUrl}`);
      console.log(`  EnhancedImageUrl (Telegram): ${prod.enhancedImageUrl}`);
      console.log(`  Source: ${prod.source}`);
      console.log(`  PlatformType: ${prod.platformType}`);
      console.log(`  CreatedAt: ${prod.createdAt}`);
      console.log('------------------------------------');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
