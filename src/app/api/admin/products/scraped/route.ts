import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const ratingFilter = searchParams.get('rating') || 'all'; // 'all' | 'unrated' | 'rated' | '1'..'5'

  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (ratingFilter === 'unrated') {
    where.userRating = null;
  } else if (ratingFilter === 'rated') {
    where.userRating = { not: null };
  } else if (['1', '2', '3', '4', '5'].includes(ratingFilter)) {
    where.userRating = parseInt(ratingFilter);
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          links: true,
          productLinks: true,
        }
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (error) {
    console.error('❌ Erro no GET /api/admin/products/scraped:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
