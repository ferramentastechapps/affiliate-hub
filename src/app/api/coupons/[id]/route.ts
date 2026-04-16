import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    
    // Verificar se cupom existe
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });
    
    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }
    
    // Validar productId se fornecido
    if (body.productId) {
      const product = await prisma.product.findUnique({
        where: { id: body.productId }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        );
      }
    }
    
    // Converter code para maiúsculas se fornecido
    if (body.code) {
      body.code = body.code.toUpperCase();
    }
    
    // Converter expiresAt para Date se fornecido
    if (body.expiresAt) {
      body.expiresAt = new Date(body.expiresAt);
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: body
    });
    
    console.log('✅ Cupom atualizado:', coupon.id);
    return NextResponse.json(coupon);
  } catch (error) {
    console.error('❌ Erro ao atualizar cupom:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar cupom',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar se cupom existe
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });
    
    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      );
    }
    
    await prisma.coupon.delete({
      where: { id }
    });
    
    console.log('✅ Cupom deletado:', id);
    return NextResponse.json({ success: true, message: 'Cupom deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar cupom:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao deletar cupom',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
