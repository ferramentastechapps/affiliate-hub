import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, platform, channel } = body;

    if (!productId) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || 'unknown';

    // 1. Buscar o produto pelo shortId (número) ou id (string)
    const isNumeric = /^\d+$/.test(productId);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(productId) } : { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // 2. Registrar o log do clique
    await prisma.clickLog.create({
      data: {
        productId: product.id,
        channel: channel || 'website',
        userAgent: userAgent.substring(0, 255),
        referrer: referrer.substring(0, 255)
      }
    });

    // 3. Incrementar o contador de cliques geral
    await prisma.product.update({
      where: { id: product.id },
      data: { clicks: { increment: 1 } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar clique:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
