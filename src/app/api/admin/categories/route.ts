import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    // Busca instâncias distintas de categoria (existentes no banco agora)
    const products = await prisma.product.findMany({
      where: {
        category: { not: '' }
      },
      select: { category: true },
      distinct: ['category']
    });

    const categories = products
      .map(p => p.category)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    // Se o banco estiver vazio, retorna uma lista padrão mínima
    if (categories.length === 0) {
      const defaultCategories = [
        "Smartphones e TV", "Informática e Games", "Casa e Eletrodomésticos",
        "Moda e Acessórios", "Saúde e Beleza", "Esporte e Suplementos",
        "Supermercado e Delivery", "Bebês e Crianças", "Livros, eBooks e eReaders",
        "Ferramentas e Jardim", "Automotivo", "Pet", "Viagem", "Diversos"
      ];
      return NextResponse.json(defaultCategories.sort((a, b) => a.localeCompare(b)));
    }

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
