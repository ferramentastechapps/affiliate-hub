import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      description: {
        contains: 'Oferta na loja',
      }
    }
  });

  console.log(`Found ${products.length} products to update`);

  let count = 0;
  for (const product of products) {
    if (product.description) {
      // Remover qualquer texto no formato "Oferta na loja ... no ..."
      const newDescription = product.description.replace(/Oferta na loja[^\n]+no[^\n]+/gi, '').trim();
      
      if (newDescription !== product.description) {
        await prisma.product.update({
          where: { id: product.id },
          data: { description: newDescription || null }
        });
        count++;
      }
    }
  }

  console.log(`Updated ${count} products`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
