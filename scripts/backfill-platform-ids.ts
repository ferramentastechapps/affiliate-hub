#!/usr/bin/env tsx
/**
 * FASE 1 - Script de Backfill
 * Popula platformId e platformType para produtos existentes baseado nas URLs
 */

import { prisma } from '../src/lib/prisma';

function extractPlatformId(url: string): { platformType: string | null; platformId: string | null } {
  if (!url) return { platformType: null, platformId: null };

  const urlLower = url.toLowerCase();

  // Amazon — ASIN: 10 chars alfanuméricos após /dp/ ou /gp/product/
  if (urlLower.includes('amazon') || urlLower.includes('amzn')) {
    const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (match) {
      return { platformType: 'amazon', platformId: match[1].toUpperCase() };
    }
  }

  // Mercado Livre — MLB seguido de dígitos
  if (urlLower.includes('mercadolivre') || urlLower.includes('mercadolibre') || urlLower.includes('meli.la')) {
    const match = url.match(/(MLB-?\d+)/i);
    if (match) {
      const mlbId = match[1].toUpperCase().replace('-', '');
      return { platformType: 'mercadolivre', platformId: mlbId };
    }
  }

  // Shopee — item ID e shop ID
  if (urlLower.includes('shopee') || urlLower.includes('shope.ee')) {
    let match = url.match(/product\/(\d+)\/(\d+)/);
    if (match) {
      return { platformType: 'shopee', platformId: `${match[1]}-${match[2]}` };
    }
    match = url.match(/-i\.(\d+)\.(\d+)/);
    if (match) {
      return { platformType: 'shopee', platformId: `${match[1]}-${match[2]}` };
    }
  }

  // Magalu
  if (urlLower.includes('magalu') || urlLower.includes('magazineluiza') || urlLower.includes('magazinevoce')) {
    const match = url.match(/\/p\/([a-z0-9-]+)\//i);
    if (match) {
      return { platformType: 'magalu', platformId: match[1].toLowerCase() };
    }
  }

  // KaBuM
  if (urlLower.includes('kabum')) {
    const match = url.match(/\/produto\/(\d+)/i);
    if (match) {
      return { platformType: 'kabum', platformId: match[1] };
    }
  }

  // Netshoes
  if (urlLower.includes('netshoes')) {
    const match = url.match(/\/produto\/([a-z0-9-]+)/i);
    if (match) {
      return { platformType: 'netshoes', platformId: match[1].toLowerCase() };
    }
  }

  // AliExpress
  if (urlLower.includes('aliexpress')) {
    const match = url.match(/\/item\/(\d+)\.html/i);
    if (match) {
      return { platformType: 'aliexpress', platformId: match[1] };
    }
  }

  // TikTok Shop
  if (urlLower.includes('tiktok.com')) {
    const match = url.match(/\/product\/(\d+)/i);
    if (match) {
      return { platformType: 'tiktok', platformId: match[1] };
    }
  }

  return { platformType: null, platformId: null };
}

async function backfillPlatformIds() {
  console.log('🔄 Iniciando backfill de platformId e platformType...\n');

  // Buscar produtos sem platformId/platformType
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { platformId: null },
        { platformType: null }
      ]
    },
    include: {
      links: true,
      productLinks: true
    }
  });

  console.log(`📦 ${products.length} produtos encontrados sem platformId/platformType\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Tentar extrair de ProductLinks primeiro (mais confiável)
      let platformType: string | null = null;
      let platformId: string | null = null;

      if (product.productLinks && product.productLinks.length > 0) {
        for (const link of product.productLinks) {
          if (link.sourceUrl) {
            const extracted = extractPlatformId(link.sourceUrl);
            if (extracted.platformType && extracted.platformId) {
              platformType = extracted.platformType;
              platformId = extracted.platformId;
              console.log(`  ✅ ${product.name.substring(0, 50)}...`);
              console.log(`     → ${platformType}: ${platformId} (de ProductLink)`);
              break;
            }
          }
        }
      }

      // Se não encontrou, tentar links legados
      if (!platformType && product.links) {
        const platforms = ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'magalu', 'kabum', 'netshoes', 'tiktok'];
        
        for (const platform of platforms) {
          const url = (product.links as any)[platform];
          if (url) {
            const extracted = extractPlatformId(url);
            if (extracted.platformType && extracted.platformId) {
              platformType = extracted.platformType;
              platformId = extracted.platformId;
              console.log(`  ✅ ${product.name.substring(0, 50)}...`);
              console.log(`     → ${platformType}: ${platformId} (de Link legado)`);
              break;
            }
          }
        }
      }

      if (platformType && platformId) {
        // Verificar se já existe outro produto com mesmo platformId+platformType
        const duplicate = await prisma.product.findFirst({
          where: {
            platformId,
            platformType,
            id: { not: product.id }
          }
        });

        if (duplicate) {
          console.log(`     ⚠️  DUPLICATA encontrada! Produto ${duplicate.id} já tem ${platformType}:${platformId}`);
          console.log(`     → Pulando atualização para evitar conflito\n`);
          skipped++;
          continue;
        }

        // Atualizar produto
        await prisma.product.update({
          where: { id: product.id },
          data: {
            platformType,
            platformId
          }
        });
        updated++;
        console.log(`     ✓ Atualizado!\n`);
      } else {
        console.log(`  ⚠️  ${product.name.substring(0, 50)}...`);
        console.log(`     → Nenhum platformId encontrado`);
        console.log(`     → Links disponíveis: ${product.productLinks?.length || 0} ProductLinks, ${product.links ? 'Link legado' : 'sem links'}\n`);
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Erro ao processar produto ${product.id}:`, error);
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO DO BACKFILL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Atualizados: ${updated}`);
  console.log(`⚠️  Pulados: ${skipped}`);
  console.log(`❌ Erros: ${failed}`);
  console.log(`📦 Total processado: ${products.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

backfillPlatformIds()
  .then(() => {
    console.log('✅ Backfill concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
