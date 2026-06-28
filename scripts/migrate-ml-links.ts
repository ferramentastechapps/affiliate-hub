import { PrismaClient } from '@prisma/client';
import { resolveRedirect, generateAffiliateLink } from '../src/lib/affiliate';

const SUPABASE_URL = "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
  datasources: {
    db: { url: SUPABASE_URL }
  }
});

// Parâmetro de linha de comando para controle do Dry-Run
const isDryRun = process.argv.includes('--dry-run');

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`🚀 Iniciando migração de links do Mercado Livre (Dry-Run: ${isDryRun ? 'SIM' : 'NÃO'})`);

  // 1. Buscar os produtos ativos que precisam de correção
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const linksToUpdate = await prisma.productLink.findMany({
    where: {
      platform: 'mercadoLivre',
      product: {
        status: 'active',
        createdAt: { gte: thirtyDaysAgo }
      },
      OR: [
        { generatedAffiliateUrl: null },
        { generatedAffiliateUrl: { not: { contains: 'matt_tool' } } }
      ]
    },
    include: {
      product: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`📦 Encontrados ${linksToUpdate.length} links pendentes de correção.\n`);

  let processedCount = 0;
  let successCount = 0;
  let nullCount = 0;

  // 2. Iterar sobre cada registro
  for (const link of linksToUpdate) {
    processedCount++;
    const targetUrl = link.sourceUrl || link.affiliateUrl;
    
    if (!targetUrl) {
      console.log(`[SKIP] ID: ${link.productId} → Sem sourceUrl ou affiliateUrl.`);
      nullCount++;
      continue;
    }

    try {
      // Obter URL real e gerar link de afiliado
      const resolvedUrl = await resolveRedirect(targetUrl);
      const newAffiliateUrl = await generateAffiliateLink(targetUrl, resolvedUrl);

      if (newAffiliateUrl) {
        if (!isDryRun) {
          // Salva no banco de dados
          await prisma.productLink.update({
            where: { id: link.id },
            data: { generatedAffiliateUrl: newAffiliateUrl }
          });
        }
        console.log(`[OK] ID: ${link.productId} → ${newAffiliateUrl}`);
        successCount++;
      } else {
        console.log(`[SKIP] ID: ${link.productId} → Retornou null na geração (mantido como está).`);
        nullCount++;
      }
    } catch (error: any) {
      console.log(`[ERROR] ID: ${link.productId} → Erro ao processar: ${error.message}`);
      nullCount++;
    }

    // Rate limit: Aguarda 500ms antes da próxima chamada
    await delay(500);
  }

  // 3. Resumo da execução
  console.log(`\n================ RESUMO ================`);
  console.log(`Total processados: ${processedCount}`);
  console.log(`Total atualizados com sucesso: ${successCount}`);
  console.log(`Total que retornaram null/erro: ${nullCount}`);
  console.log(`========================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
