import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imgId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const { id, imgId } = await params;
    const body = await request.json();
    const { isPrimary, order } = body;

    const data: any = {};
    if (order !== undefined) data.order = order;

    if (isPrimary === true) {
      // Desmarcar outras imagens como primárias
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false }
      });
      data.isPrimary = true;
    }

    const updated = await prisma.productImage.update({
      where: { id: imgId },
      data
    });

    if (isPrimary === true) {
      // Atualizar imagem legada no Produto
      await prisma.product.update({
        where: { id },
        data: { imageUrl: updated.url }
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar imagem:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imgId: string }> }
) {
  try {
    const sessionToken = cookies().get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const { id, imgId } = await params;

    await prisma.productImage.delete({
      where: { id: imgId }
    });

    // Se deletou a principal, garantir que tem outra (se existir)
    const remainingImages = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { order: 'asc' }
    });

    if (remainingImages.length > 0) {
      const hasPrimary = remainingImages.some(i => i.isPrimary);
      if (!hasPrimary) {
        await prisma.productImage.update({
          where: { id: remainingImages[0].id },
          data: { isPrimary: true }
        });
        await prisma.product.update({
          where: { id },
          data: { imageUrl: remainingImages[0].url }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar imagem:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
