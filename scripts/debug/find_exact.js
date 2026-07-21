const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      images: true
    }
  });
  console.log('Result:', JSON.stringify(products.map(p => ({
    id: p.id,
    name: p.name,
    storeName: p.storeName,
    imageUrl: p.imageUrl,
    enhancedImageUrl: p.enhancedImageUrl,
    createdAt: p.createdAt,
    images: p.images.map(i => i.url)
  })), null, 2));
}
main().finally(() => prisma.$disconnect());
