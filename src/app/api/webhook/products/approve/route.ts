import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhook/products/approve
 * Aprova um produto pendente e atualiza o link de afiliado
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, platform, affiliateLink } = body;
    
    // Validação
    if (!productId) {
      return NextResponse.json(
        { error: 'productId é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!platform || !affiliateLink) {
      return NextResponse.json(
        { error: 'platform e affiliateLink são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (!affiliateLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'affiliateLink deve ser uma URL válida' },
        { status: 400 }
      );
    }
    
    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { links: true }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Atualizar status do produto para active
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'active' }
    });
    
    // Atualizar ou criar o link de afiliado
    if (product.links) {
      // Atualizar link existente
      await prisma.link.update({
        where: { id: product.links.id },
        data: {
          [platform]: affiliateLink
        }
      });
    } else {
      // Criar novo link
      await prisma.link.create({
        data: {
          productId: productId,
          [platform]: affiliateLink
        }
      });
    }
    
    console.log(`✅ Produto aprovado: ${productId} | Plataforma: ${platform}`);
    
    return NextResponse.json({
      success: true,
      message: 'Produto aprovado e link atualizado',
      productId,
      platform,
      product: {
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        category: product.category,
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao aprovar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao aprovar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
