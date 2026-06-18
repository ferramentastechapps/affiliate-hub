const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpar() {
  console.log('🗑️  Apagando todos os produtos...');
  
  // Primeiro apagar os links (relacionamento)
  const linksCount = await prisma.link.deleteMany({});
  console.log(`✅ ${linksCount.count} links apagados`);
  
  // Apagar histórico de preços
  const historyCount = await prisma.priceHistory.deleteMany({});
  console.log(`✅ ${historyCount.count} registros de histórico apagados`);
  
  // Apagar logs de cliques
  const clicksCount = await prisma.clickLog.deleteMany({});
  console.log(`✅ ${clicksCount.count} logs de cliques apagados`);
  
  // Depois apagar os produtos
  const produtosCount = await prisma.product.deleteMany({});
  console.log(`✅ ${produtosCount.count} produtos apagados`);
  
  console.log('');
  console.log('🎉 Banco limpo! Próximo produto terá shortId = 1');
  
  await prisma.$disconnect();
}

limpar().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
