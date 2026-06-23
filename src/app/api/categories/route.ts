import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = products.map(p => p.category).filter(Boolean).sort();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
