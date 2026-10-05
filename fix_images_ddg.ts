import { PrismaClient } from '@prisma/client';
import { searchDuckDuckGoImages } from './src/lib/scraper';
import { saveEnhancedImage } from './src/lib/storage';
import path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('Buscando produtos...');
  
  // Pegar todos os produtos com imagem /enhanced/ das últimas 6 horas 
  // OU que contêm dominios agregadores (o check do isAggregatorImage)
  const sixHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);

  const badProducts = await prisma.product.findMany({
    where: {
      OR: [
        { imageUrl: { contains: 'pechinchou.com.br' } },
        { imageUrl: { contains: 'promobit.com.br' } },
        { imageUrl: { contains: 'gatry.com' } },
        { imageUrl: { contains: 'pelando.com.br' } },
        { 
          imageUrl: { contains: '/enhanced/' }, 
          updatedAt: { gte: sixHoursAgo }
        }
      ],
      status: { not: 'rejected' }
    },
    take: 200,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Encontrados ${badProducts.length} produtos para tentar corrigir.`);

  for (const product of badProducts) {
    try {
      console.log(`\n[${product.id}] Corrigindo: ${product.name}`);
      console.log(`  - Url Atual: ${product.imageUrl}`);
      
      const ddgResults = await searchDuckDuckGoImages(product.name);
      if (ddgResults && ddgResults.length > 0) {
        const ddgUrl = ddgResults[0].image;
        if (!ddgUrl) continue;
        
        console.log(`  - Encontrou DDG URL: ${ddgUrl}`);
        
        const savedUrl = await saveEnhancedImage(ddgUrl, false);
        if (savedUrl) {
           await prisma.product.update({
             where: { id: product.id },
             data: { imageUrl: savedUrl }
           });
           console.log(`  - Salvo como: ${savedUrl}`);
        } else {
           console.warn(`  - Falha ao baixar imagem do DDG, setando placeholder`);
           await prisma.product.update({
             where: { id: product.id },
             data: { imageUrl: '/placeholder.webp' }
           });
        }
      } else {
        console.log(`  - Nenhuma imagem encontrada no DDG, setando placeholder...`);
        await prisma.product.update({
             where: { id: product.id },
             data: { imageUrl: '/placeholder.webp' }
        });
      }
    } catch (e: any) {
      console.log('  - Error:', e.message);
    }
    // sleep
    await new Promise(r => setTimeout(r, 2000));
  }
}
run();
