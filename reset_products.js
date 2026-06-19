const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Product" RESTART IDENTITY CASCADE;');
  console.log('Tabela Product apagada e ID resetado!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
