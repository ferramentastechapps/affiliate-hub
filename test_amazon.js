const { PrismaClient } = require('@prisma/client');
const { isUsableImageUrl } = require('./src/lib/imageUtils');

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { store: 'Amazon' },
    select: { name: true, imageUrl: true },
    take: 20
  });
  
  for (const p of products) {
     const usable = isUsableImageUrl(p.imageUrl);
     if (!usable) {
       console.log("BLOCKED:", p.imageUrl);
     }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
