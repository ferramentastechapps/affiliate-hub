const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("LAST 10 PRODUCTS:");
  products.forEach(p => {
    console.log(`[${p.id}] ${p.name.substring(0, 30)}...`);
    console.log(`  imageUrl: ${p.imageUrl}`);
    console.log(`  enhancedImageUrl: ${p.enhancedImageUrl}`);
  });
}
check().catch(console.error).finally(() => process.exit(0));
