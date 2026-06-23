const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== LIMPANDO PRODUTOS DO BANCO (MANTENDO USUÁRIOS) ===');
  
  // Contar antes
  const countBefore = await prisma.product.count();
  console.log(`Quantidade de produtos antes: ${countBefore}`);
  
  // Deletar todos os produtos
  const result = await prisma.product.deleteMany();
  console.log(`Produtos deletados: ${result.count}`);
  
  // Contar depois
  const countAfter = await prisma.product.count();
  console.log(`Quantidade de produtos depois: ${countAfter}`);
  
  // Contar usuários
  const userCount = await prisma.user.count();
  console.log(`Total de usuários no banco (mantidos intactos): ${userCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
