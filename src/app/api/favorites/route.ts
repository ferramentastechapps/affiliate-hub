import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return null;

    const payload = verifyToken(sessionToken);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

// GET: Retorna lista de favoritos ou status de um produto específico
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (productId) {
      if (!userId) {
        return NextResponse.json({ isFavorited: false });
      }
      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_productId: { userId, productId },
        },
      });
      return NextResponse.json({ isFavorited: !!favorite });
    }

    if (!userId) {
      return NextResponse.json({ favorites: [], total: 0 });
    }

    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            links: true,
            coupons: true,
            productLinks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      favorites: favorites.map((f) => ({
        id: f.id,
        productId: f.productId,
        createdAt: f.createdAt,
        product: f.product,
      })),
      total: favorites.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar favoritos:', error);
    return NextResponse.json({ error: 'Erro ao buscar favoritos' }, { status: 500 });
  }
}

// POST: Adiciona aos favoritos
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = body.productId;

    if (!productId) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { category: true, subcategory: true, brand: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const favorite = await prisma.userFavorite.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: {
        userId,
        productId,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
      },
      update: {},
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error: any) {
    console.error('Erro ao salvar favorito:', error);
    return NextResponse.json({ error: 'Erro ao salvar favorito' }, { status: 500 });
  }
}

// DELETE: Remove dos favoritos
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let productId: string | null = null;
    const { searchParams } = new URL(request.url);
    productId = searchParams.get('productId');

    if (!productId) {
      const body = await request.json().catch(() => ({}));
      productId = body.productId;
    }

    if (!productId) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    await prisma.userFavorite.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return NextResponse.json({ success: true, removed: true });
  } catch (error: any) {
    console.error('Erro ao remover favorito:', error);
    return NextResponse.json({ error: 'Erro ao remover favorito' }, { status: 500 });
  }
}
