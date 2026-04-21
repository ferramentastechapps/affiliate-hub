import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

/**
 * POST /api/webhook/products/reject
 * Rejeita um produto pendente
 */
export async function POST(request: Request) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. API key inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId } = body;
    
    // Validação
    if (!productId) {
      return NextResponse.json(
        { error: 'productId é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Atualizar status do produto para rejected
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'rejected' }
    });
    
    console.log(`❌ Produto rejeitado: ${productId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Produto rejeitado',
      productId
    });
    
  } catch (error) {
    console.error('❌ Erro ao rejeitar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao rejeitar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
