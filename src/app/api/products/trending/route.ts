import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Busca produtos ativos com mais cliques
    // Se nenhum tiver cliques, busca os mais recentes com desconto
    let products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
        clicks: { gt: 0 },
      },
      include: {
        links: true,
        coupons: true,
        productLinks: { where: { isActive: true } },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
      orderBy: [
        { clicks: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 12,
    });

    // Fallback: se houver menos de 4 produtos com cliques, completa com os mais recentes
    if (products.length < 4) {
      const existingIds = products.map((p) => p.id);
      const fallbackProducts = await prisma.product.findMany({
        where: {
          status: { in: ['active', 'approved'] },
          id: { notIn: existingIds },
        },
        include: {
          links: true,
          coupons: true,
          productLinks: { where: { isActive: true } },
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12 - products.length,
      });

      products = [...products, ...fallbackProducts];
    }

    return NextResponse.json(
      {
        success: true,
        products,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Erro ao buscar produtos em alta:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos em alta' }, { status: 500 });
  }
}
