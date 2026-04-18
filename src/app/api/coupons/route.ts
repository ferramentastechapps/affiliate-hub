import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(coupons);
  } catch (error) {
    console.error('❌ Erro ao buscar cupons:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar cupons',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, description, discount, platform, productId, expiresAt } = body;
    
    // Validação de campos obrigatórios
    if (!code || !description || !discount || !platform) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: code, description, discount, platform' },
        { status: 400 }
      );
    }
    
    // Validar se produto existe (se fornecido)
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        );
      }
    }
    
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discount,
        platform,
        productId: productId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    
    console.log('✅ Cupom criado:', coupon.id);
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar cupom:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao criar cupom',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
