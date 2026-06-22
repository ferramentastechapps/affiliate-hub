import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const images = await prisma.productImage.findMany({
      where: { productId: params.id },
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(images);
  } catch (error: any) {
    console.error('Erro ao buscar imagens:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = cookies().get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { url, isPrimary } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Calcular próxima ordem
    const existingImages = await prisma.productImage.findMany({
      where: { productId: params.id }
    });
    const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.order), -1);

    // Se for primary, garantir que as outras não sejam
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: params.id },
        data: { isPrimary: false }
      });
      // Atualizar no produto legado também
      await prisma.product.update({
        where: { id: params.id },
        data: { imageUrl: url }
      });
    }

    const newImage = await prisma.productImage.create({
      data: {
        url,
        isPrimary: isPrimary || existingImages.length === 0,
        order: maxOrder + 1,
        productId: params.id
      }
    });

    // Se for a primeira imagem, ela precisa ser primária no produto
    if (existingImages.length === 0) {
      await prisma.product.update({
        where: { id: params.id },
        data: { imageUrl: url }
      });
    }

    return NextResponse.json(newImage, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar imagem:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
