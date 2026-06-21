import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    let whereClause: any = {
      status: { in: ['active', 'approved'] } // Default: apenas aprovados/ativos
    };

    if (statusParam === 'all') {
      whereClause = {};
    } else if (statusParam === 'pending') {
      whereClause = { status: 'pending' };
    } else if (statusParam === 'rejected') {
      whereClause = { status: 'rejected' };
    } else if (statusParam === 'active') {
      whereClause = { status: { in: ['active', 'approved'] } };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      take: 100, // Limite para não sobrecarregar e travar o navegador
      include: {
        links: true,
        coupons: {
          where: { 
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          }
        },
        votes: {
          select: { type: true, userId: true } // Pegamos o userId para que o front saiba se o usuário já curtiu
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Mapear os votos para retornar a contagem separada
    const mappedProducts = products.map(p => {
      const likes = p.votes.filter(v => v.type === 'LIKE').length;
      const dislikes = p.votes.filter(v => v.type === 'DISLIKE').length;
      
      return {
        ...p,
        _count: {
          ...p._count,
          likes,
          dislikes
        }
        // Mantemos os `votes` no payload para o front-end saber o voto atual do usuário sem fazer fetch extra
      };
    });

    return NextResponse.json(mappedProducts);
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar produtos',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, description, imageUrl, price, originalPrice, links } = body;
    
    // Validação de campos obrigatórios
    if (!name || !category || !imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }
    
    // Validação de URL da imagem
    if (!imageUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'imageUrl deve ser uma URL válida (começar com http)' },
        { status: 400 }
      );
    }
    
    const product = await prisma.product.create({
      data: {
        name,
        category,
        description,
        imageUrl,
        price: price ? parseFloat(price) : null,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        links: links ? {
          create: links
        } : undefined
      },
      include: {
        links: true
      }
    });
    
    console.log('✅ Produto criado:', product.id);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao criar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
