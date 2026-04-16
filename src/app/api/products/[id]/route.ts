import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { name, category, description, imageUrl, price, links } = body;
    
    // Validação de campos obrigatórios
    if (!name || !category || !imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }
    
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        category,
        description,
        imageUrl,
        price: price ? parseFloat(price) : null,
        links: links ? {
          upsert: {
            create: links,
            update: links
          }
        } : undefined
      },
      include: {
        links: true
      }
    });
    
    console.log('✅ Produto atualizado:', product.id);
    return NextResponse.json(product);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar produto',
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
    
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    await prisma.product.delete({
      where: { id }
    });
    
    console.log('✅ Produto deletado:', id);
    return NextResponse.json({ success: true, message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao deletar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
