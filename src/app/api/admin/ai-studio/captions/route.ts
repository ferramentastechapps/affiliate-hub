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
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const ratingFilter = searchParams.get('rating'); // 'unrated' | '1' | '2' | '3' | '4' | '5' | 'examples'

  const skip = (page - 1) * limit;

  const where: any = {};
  if (ratingFilter === 'unrated') where.rating = null;
  else if (ratingFilter === 'examples') where.usedAsExample = true;
  else if (ratingFilter && ['1','2','3','4','5'].includes(ratingFilter)) {
    where.rating = parseInt(ratingFilter);
  }

  const [captionsRaw, total] = await Promise.all([
    prisma.captionHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.captionHistory.count({ where }),
  ]);

  const productIds = captionsRaw.map((c) => c.productId).filter(Boolean) as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, imageUrl: true }
  });

  const productMap = Object.fromEntries(products.map(p => [p.id, p.imageUrl]));

  const captions = captionsRaw.map((c) => ({
    ...c,
    imageUrl: c.productId ? productMap[c.productId] : null
  }));

  return NextResponse.json({ captions, total, page, limit });
}
