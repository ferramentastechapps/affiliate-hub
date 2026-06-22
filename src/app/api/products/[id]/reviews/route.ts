import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviews = await prisma.productReview.findMany({
      where: { productId: id },
      orderBy: [
        { helpful: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: 10
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Erro ao buscar reviews:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
