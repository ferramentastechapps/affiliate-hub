/**
 * Script de recuperação retroativa de legendas perdidas.
 *
 * Busca todos os produtos que:
 * 1. Têm aiAnalysis com um campo "titulo" (legenda gerada pela IA)
 * 2. Não têm nenhum registro correspondente em CaptionHistory
 *
 * Cria os registros retroativamente para que apareçam no AI Studio para avaliação.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando produtos com legenda gerada mas sem registro no histórico...\n');

  // Busca produtos que tenham aiAnalysis (contém o campo titulo)
  const products = await prisma.product.findMany({
    where: {
      aiAnalysis: { not: null },
      aiProcessed: true,
    },
    select: {
      id: true,
      name: true,
      aiAnalysis: true,
      aiScore: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📦 Total de produtos com IA processada: ${products.length}`);

  // Busca todos os productIds que já têm entrada no CaptionHistory
  const existingEntries = await prisma.captionHistory.findMany({
    where: {
      productId: { not: null },
    },
    select: { productId: true },
  });

  const existingProductIds = new Set(existingEntries.map(e => e.productId));
  console.log(`✅ Já existem no histórico: ${existingProductIds.size} entradas\n`);

  let recovered = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    // Pula se já tem entrada no histórico para este produto
    if (existingProductIds.has(product.id)) {
      skipped++;
      continue;
    }

    // Tenta extrair o titulo do aiAnalysis (JSON)
    let titulo = null;
    try {
      const parsed = typeof product.aiAnalysis === 'string'
        ? JSON.parse(product.aiAnalysis)
        : product.aiAnalysis;
      titulo = parsed?.titulo || null;
    } catch {
      // aiAnalysis não é JSON válido, pula
      failed++;
      continue;
    }

    if (!titulo) {
      skipped++;
      continue;
    }

    // Cria o registro no histórico
    try {
      await prisma.captionHistory.create({
        data: {
          productId: product.id,
          productName: product.name,
          caption: titulo,
          score: product.aiScore ?? null,
          createdAt: product.createdAt, // mantém a data original
        },
      });
      recovered++;
      console.log(`  ✔ [${product.status}] "${product.name}" → "${titulo}" (score: ${product.aiScore ?? 'n/a'})`);
    } catch (err) {
      console.error(`  ✗ Erro ao salvar "${product.name}":`, err.message);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Recuperadas:  ${recovered} legendas`);
  console.log(`⏭️  Já existiam:  ${skipped} (ignoradas)`);
  console.log(`❌ Falhas:       ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('\nPronto! Acesse o AI Studio para avaliar as legendas recuperadas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
