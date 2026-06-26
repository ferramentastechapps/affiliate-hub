const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.product.count();
  const last7days = await prisma.product.count({ 
    where: { createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } } 
  });
  const today = await prisma.product.count({ 
    where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } 
  });
  
  const withAI = await prisma.product.count({ where: { aiAnalysis: { not: null } } });
  const withScore = await prisma.product.count({ where: { aiScore: { not: null } } });
  
  const captionHistory = await prisma.captionHistory.count();
  const captionLast7 = await prisma.captionHistory.count({
    where: { createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } }
  });
  
  console.log('=== VOLUME REAL DE PRODUTOS ===');
  console.log('Total produtos no banco:', total);
  console.log('Últimos 7 dias:', last7days);
  console.log('Últimas 24h:', today);
  console.log('Com aiAnalysis:', withAI);
  console.log('Com aiScore:', withScore);
  console.log('\n=== HISTÓRICO DE LEGENDAS (Caption) ===');
  console.log('Total de legendas geradas:', captionHistory);
  console.log('Últimos 7 dias:', captionLast7);
  
  await prisma.$disconnect();
}

main().catch(console.error);
