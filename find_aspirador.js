const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Philco', mode: 'insensitive' } },
        { name: { contains: 'Mop', mode: 'insensitive' } }
      ]
    },
    include: {
      images: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Encontrados ${products.length} produtos:`);
  products.forEach(p => {
    console.log(`\nID: ${p.id}`);
    console.log(`Nome: ${p.name}`);
    console.log(`Store: ${p.storeName}`);
    console.log(`imageUrl: ${p.imageUrl}`);
    console.log(`enhancedImageUrl: ${p.enhancedImageUrl}`);
    console.log('Gallery Images:', p.images.map(img => img.url));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
