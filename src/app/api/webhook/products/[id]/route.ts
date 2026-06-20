import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey, validateWebhookSignature } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { links: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        shortId: product.shortId,
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        enhancedImageUrl: product.enhancedImageUrl,
        price: product.price,
        originalPrice: product.originalPrice,
        status: product.status,
        aiScore: product.aiScore,
        aiAnalysis: product.aiAnalysis,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        links: product.links
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { imageUrl, status, name, category, price } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        imageUrl: imageUrl || undefined,
        status: status || undefined,
        name: name || undefined,
        category: category || undefined,
        price: price !== undefined ? price : undefined,
      }
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Erro ao atualizar produto via webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar produto' },
      { status: 500 }
    );
  }
}
