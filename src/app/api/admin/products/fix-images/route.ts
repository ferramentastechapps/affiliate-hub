import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchBingImages } from '@/lib/scraper';
import { isUsableImageUrl } from '@/lib/imageUtils';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

    // Buscar produtos ativos sem imagem válida ou com placeholder/unavailable
    const productsToFix = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved', 'pending'] },
        OR: [
          { imageUrl: '/placeholder.webp' },
          { imageUrl: { contains: 'placeholder' } },
          { imageUrl: { contains: 'unavailable' } },
          { imageUrl: { contains: '01rmKvkK-lL' } },
          { imageUrl: { contains: '31ptVi11gmL' } },
          { imageUrl: { contains: '41Vok2o740L' } },
          { imageUrl: { contains: 'no-image' } },
          { imageUrl: '' },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        enhancedImageUrl: true,
      },
    });

    const results: Array<{ id: string; name: string; oldImage: string; newImage: string | null }> = [];

    for (const product of productsToFix) {
      try {
        // Se já tiver enhancedImageUrl válida, usa ela
        if (isUsableImageUrl(product.enhancedImageUrl)) {
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: product.enhancedImageUrl },
          });
          results.push({
            id: product.id,
            name: product.name,
            oldImage: product.imageUrl,
            newImage: product.enhancedImageUrl,
          });
          continue;
        }

        // Busca uma imagem de alta qualidade via Bing
        const cleanName = product.name
          .replace(/[\(\)\[\]]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const ddgResults = await searchBingImages(cleanName);
        if (ddgResults && ddgResults.length > 0 && ddgResults[0].image) {
          const foundUrl = ddgResults[0].image;
          await prisma.product.update({
            where: { id: product.id },
            data: {
              imageUrl: foundUrl,
              enhancedImageUrl: ddgResults[1]?.image || null,
            },
          });
          results.push({
            id: product.id,
            name: product.name,
            oldImage: product.imageUrl,
            newImage: foundUrl,
          });
        }
      } catch (err) {
        console.error(`Erro ao curar imagem do produto ${product.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      foundPending: productsToFix.length,
      fixedCount: results.length,
      fixedProducts: results,
    });
  } catch (error: any) {
    console.error('Erro na rota de correção de imagens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
