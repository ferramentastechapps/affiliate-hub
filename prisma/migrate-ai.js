const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migração de histórico de legendas da IA...');

  // Busca todos os produtos que possuem aiAnalysis preenchido
  const products = await prisma.product.findMany({
    where: {
      aiAnalysis: { not: null },
    },
    select: {
      id: true,
      name: true,
      aiAnalysis: true,
      aiScore: true,
      updatedAt: true,
    },
  });

  console.log(`Encontrados ${products.length} produtos com legendas geradas.`);

  if (products.length === 0) {
    console.log('Nada para migrar.');
    return;
  }

  let count = 0;
  for (const p of products) {
    if (!p.aiAnalysis) continue;
    
    // Verifica se já existe para evitar duplicação em múltiplas execuções
    const existing = await prisma.captionHistory.findFirst({
      where: { productId: p.id, caption: p.aiAnalysis },
    });

    if (!existing) {
      await prisma.captionHistory.create({
        data: {
          productId: p.id,
          productName: p.name,
          caption: p.aiAnalysis,
          score: p.aiScore,
          createdAt: p.updatedAt, // Usa a data da última atualização como aproximação
        },
      });
      count++;
    }
  }

  console.log(`Migração concluída! ${count} novas legendas adicionadas ao histórico.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
