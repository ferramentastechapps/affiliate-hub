const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  console.log('🔧 Resetando sequência do shortId...');
  
  // Resetar a sequência do autoincrement
  await prisma.$executeRaw`ALTER SEQUENCE "Product_shortId_seq" RESTART WITH 1;`;
  
  console.log('✅ Sequência resetada! Próximo produto terá shortId = 1');
  
  await prisma.$disconnect();
}

reset().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
