const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNÓSTICO DE PROCESSAMENTO DE IA ===\n');
  
  // 1. Total de produtos
  const totalProducts = await prisma.product.count();
  console.log('Total de produtos no banco:', totalProducts);
  
  // 2. Produtos com aiProcessed = true
  const processedCount = await prisma.product.count({
    where: { aiProcessed: true }
  });
  console.log('Produtos com aiProcessed = true:', processedCount);
  console.log(`Percentual processado: ${((processedCount / totalProducts) * 100).toFixed(2)}%`);
  
  // 3. Produtos com aiProcessed = false
  const notProcessedCount = await prisma.product.count({
    where: { aiProcessed: false }
  });
  console.log('\nProdutos com aiProcessed = false:', notProcessedCount);
  
  // 4. Produtos com aiScore preenchido
  const withScore = await prisma.product.count({
    where: { aiScore: { not: null } }
  });
  console.log('Produtos com aiScore preenchido:', withScore);
  
  // 5. Produtos com aiAnalysis preenchido
  const withAnalysis = await prisma.product.count({
    where: { aiAnalysis: { not: null } }
  });
  console.log('Produtos com aiAnalysis preenchido:', withAnalysis);
  
  // 6. Produtos criados nos últimos 7 dias
  const last7Days = await prisma.product.count({
    where: { 
      createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) }
    }
  });
  console.log('\n=== VOLUME DOS ÚLTIMOS 7 DIAS ===');
  console.log('Produtos criados:', last7Days);
  console.log('Média por dia:', (last7Days / 7).toFixed(0));
  
  // 7. Produtos não processados dos últimos 7 dias
  const notProcessedLast7Days = await prisma.product.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) },
      aiProcessed: false
    }
  });
  console.log('Não processados (últimos 7 dias):', notProcessedLast7Days);
  
  // 8. CaptionHistory (chamadas de IA para caption)
  const captionTotal = await prisma.captionHistory.count();
  const captionLast7 = await prisma.captionHistory.count({
    where: { createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } }
  });
  
  console.log('\n=== HISTÓRICO DE LEGENDAS (CHAMADAS DE IA) ===');
  console.log('Total de legendas geradas:', captionTotal);
  console.log('Últimos 7 dias:', captionLast7);
  console.log('Média por dia:', (captionLast7 / 7).toFixed(0));
  
  // 9. Estimativa de re-processamento
  const reprocessingRate = captionLast7 - last7Days;
  console.log('\n=== ANÁLISE DE RE-PROCESSAMENTO ===');
  if (reprocessingRate > 0) {
    console.log(`⚠️  ALERTA: ${reprocessingRate} chamadas EXTRAS de IA detectadas!`);
    console.log(`Isso significa que produtos estão sendo re-processados.`);
    console.log(`Taxa de re-processamento: ${((reprocessingRate / captionLast7) * 100).toFixed(2)}%`);
  } else {
    console.log('✅ Sem re-processamento detectado (1 chamada por produto)');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
