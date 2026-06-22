import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json({ error: 'Parâmetro category é obrigatório' }, { status: 400 });
    }

    // Busca instâncias distintas de subcategory para a categoria fornecida
    const products = await prisma.product.findMany({
      where: {
        category,
        subcategory: { not: null, not: "" }
      },
      select: { subcategory: true },
      distinct: ['subcategory']
    });

    const subcategories = products
      .map(p => p.subcategory)
      .filter(Boolean)
      .sort((a, b) => (a as string).localeCompare(b as string));

    return NextResponse.json(subcategories);
  } catch (error: any) {
    console.error('Erro ao buscar subcategorias:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
