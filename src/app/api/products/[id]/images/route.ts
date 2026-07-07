import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await prisma.productImage.findMany({
      where: { productId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { url, isPrimary } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    const existingImages = await prisma.productImage.findMany({
      where: { productId: id }
    });
    const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.order), -1);

    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false }
      });
      await prisma.product.update({
        where: { id },
        data: { imageUrl: url, enhancedImageUrl: url }
      });
    }

    const newImage = await prisma.productImage.create({
      data: {
        url,
        isPrimary: isPrimary || existingImages.length === 0,
        order: maxOrder + 1,
        productId: id
      }
    });

    if (existingImages.length === 0) {
      await prisma.product.update({
        where: { id },
        data: { imageUrl: url, enhancedImageUrl: url }
      });
    }

    return NextResponse.json(newImage, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar imagem:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
