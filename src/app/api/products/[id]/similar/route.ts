import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 8;

    // Buscar o produto alvo para extrair suas características
    const targetProduct = await prisma.product.findUnique({
      where: { id },
      select: { category: true, subcategory: true, brand: true }
    });

    if (!targetProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Buscar todos os outros produtos ativos
    const otherProducts = await prisma.product.findMany({
      where: {
        id: { not: id },
        status: { in: ['active', 'approved'] }
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        productLinks: true,
        links: true,
        coupons: true,
      }
    });

    // Calcular pontuação de similaridade
    const scoredProducts = otherProducts.map(product => {
      let score = 0;
      
      // subcategory igual -> peso 3
      if (targetProduct.subcategory && product.subcategory === targetProduct.subcategory) {
        score += 3;
      }
      
      // brand igual -> peso 2
      if (targetProduct.brand && product.brand === targetProduct.brand) {
        score += 2;
      }
      
      // category igual -> peso 1
      if (targetProduct.category && product.category === targetProduct.category) {
        score += 1;
      }

      // Adicionar o aiScore (se existir) para desempatar/recompensar produtos de alta qualidade
      const totalScore = score + (product.aiScore || 0);

      return {
        ...product,
        similarityScore: totalScore
      };
    });

    // Filtrar apenas produtos que possuem pelo menos a mesma categoria ou uma pontuação > 0
    // (Opcional, mas ajuda a não retornar produtos completamente aleatórios)
    const validScoredProducts = scoredProducts.filter(p => p.similarityScore > 0);

    // Ordenar por score combinado em ordem decrescente
    validScoredProducts.sort((a, b) => b.similarityScore - a.similarityScore);

    // Retornar top N
    const topSimilar = validScoredProducts.slice(0, limit);

    return NextResponse.json(topSimilar);
  } catch (error: any) {
    console.error('Erro ao buscar produtos similares:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
