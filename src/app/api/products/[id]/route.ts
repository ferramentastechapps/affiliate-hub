import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { name, category, description, imageUrl, price, links, status, isFixed } = body;
    
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
        status: status || undefined,
        isFixed: isFixed !== undefined ? isFixed : undefined,
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
    
    // Tenta registrar o log de atividade se o status mudou
    if (status && status !== existingProduct.status) {
      try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;
        if (sessionToken) {
          const payload = verifyToken(sessionToken);
          if (payload && payload.userId) {
            await prisma.activityLog.create({
              data: {
                userId: payload.userId,
                action: status === 'active' ? 'product.approve' : (status === 'rejected' ? 'product.reject' : 'product.update_status'),
                entityType: 'product',
                entityId: id,
                details: JSON.stringify({ oldStatus: existingProduct.status, newStatus: status }),
              }
            });
          }
        }
      } catch (e) {
        console.error('Falha ao registrar ActivityLog:', e);
      }
    }
    
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
    
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;
      if (sessionToken) {
        const payload = verifyToken(sessionToken);
        if (payload && payload.userId) {
          await prisma.activityLog.create({
            data: {
              userId: payload.userId,
              action: 'product.delete',
              entityType: 'product',
              entityId: id,
              details: JSON.stringify({ name: existingProduct.name }),
            }
          });
        }
      }
    } catch (e) {
      console.error('Falha ao registrar ActivityLog:', e);
    }
    
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
