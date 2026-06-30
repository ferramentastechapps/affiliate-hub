import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint não fornecido' }, { status: 400 });
    }

    const sub = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    });

    if (!sub || !sub.preferences) {
      return NextResponse.json({ products: [] });
    }

    const prefs = sub.preferences as any;
    const categories = prefs.categories || [];
    const keywords = prefs.customInterests || [];

    if (categories.length === 0 && keywords.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const orConditions = [];

    if (categories.length > 0) {
      orConditions.push({ category: { in: categories } });
    }

    for (const kw of keywords) {
      orConditions.push({ name: { contains: kw, mode: 'insensitive' } });
      orConditions.push({ description: { contains: kw, mode: 'insensitive' } });
    }

    const products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
        OR: orConditions.length > 0 ? orConditions : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
        category: true,
        createdAt: true
      }
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
