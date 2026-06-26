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

    const filterParam = searchParams.get('filter');
    const userIdParam = searchParams.get('userId');
    let orderByClause: any = { createdAt: 'desc' };

    if (filterParam === 'baratinho') {
      whereClause.price = { lte: 50, gt: 0 };
    } else if (filterParam === 'menorPreco') {
      whereClause.price = { gt: 0 };
      orderByClause = { price: 'asc' };
    } else if (filterParam === 'pontuados') {
      orderByClause = { clicks: 'desc' };
    } else if (filterParam === 'alertas') {
      if (userIdParam) {
        // Obter os produtos que o usuário alertou para achar as categorias ("relacionados")
        const userAlerts = await prisma.productAlert.findMany({
          where: { userId: userIdParam },
          include: { product: { select: { category: true } } }
        });
        
        if (userAlerts.length > 0) {
          const alertedCategories = [...new Set(userAlerts.map(a => a.product.category))].filter(Boolean);
          whereClause.OR = [
            { alerts: { some: { userId: userIdParam } } },
            { category: { in: alertedCategories } }
          ];
        } else {
          whereClause.alerts = { some: { userId: userIdParam } }; // Sem alertas = array vazio
        }
      } else {
        whereClause.alerts = { some: {} }; // Fallback
      }
    } else if (filterParam === 'price-drops') {
      // FASE 2 — Filtro de produtos com queda de preço
      // Buscar produtos ativos com histórico de preços
      whereClause.status = { in: ['active', 'approved'] };
      whereClause.price = { not: null };
      whereClause.priceHistory = { some: {} }; // Tem que ter histórico
      
      orderByClause = { updatedAt: 'desc' }; // Mais recentes primeiro
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      take: 200, // Aumentado para 200 para ter mais massa de dados pros filtros que dependem de sort no front
      include: {
        links: true,
        productLinks: true,
        images: true,
        alerts: {
          select: { userId: true }
        },
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
        priceHistory: filterParam === 'price-drops' ? {
          orderBy: { createdAt: 'desc' },
          take: 50 // Últimos 50 registros para análise
        } : undefined,
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: orderByClause
    });
    
    // Mapear os votos para retornar a contagem separada
    const mappedProducts = products.map(p => {
      const likes = p.votes.filter(v => v.type === 'LIKE').length;
      const dislikes = p.votes.filter(v => v.type === 'DISLIKE').length;
      
      // FASE 2 — Calcular dados de queda de preço
      let dropPercent = 0;
      let lowestPrice30d = p.price;
      let highestPrice30d = p.price;
      
      if (filterParam === 'price-drops' && p.priceHistory && p.priceHistory.length > 0) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Filtrar histórico dos últimos 30 dias
        const history30d = p.priceHistory.filter(h => h.createdAt >= thirtyDaysAgo);
        
        if (history30d.length > 0) {
          const prices = history30d.map(h => h.price).filter(Boolean) as number[];
          lowestPrice30d = Math.min(...prices, p.price || Infinity);
          highestPrice30d = Math.max(...prices, p.price || 0);
          
          // Calcular queda percentual vs preço máximo histórico
          if (p.price && highestPrice30d > 0) {
            dropPercent = ((highestPrice30d - p.price) / highestPrice30d) * 100;
          }
        }
      }
      
      return {
        ...p,
        _count: {
          ...p._count,
          likes,
          dislikes
        },
        // Dados adicionais para price-drops
        ...(filterParam === 'price-drops' && {
          dropPercent: Math.round(dropPercent * 10) / 10, // Arredonda para 1 casa decimal
          lowestPrice30d,
          highestPrice30d
        })
        // Mantemos os `votes` no payload para o front-end saber o voto atual do usuário sem fazer fetch extra
      };
    });

    // Se for price-drops, filtrar apenas produtos com queda real e ordenar por maior queda
    let finalProducts = mappedProducts;
    if (filterParam === 'price-drops') {
      finalProducts = mappedProducts
        .filter((p: any) => p.dropPercent > 0)
        .sort((a: any, b: any) => b.dropPercent - a.dropPercent);
    }

    return NextResponse.json(finalProducts);
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
    const { name, category, description, imageUrl, price, originalPrice, links, brand, subcategory, platformProductId, productLinks, images, couponLink } = body;
    
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
        brand,
        subcategory,
        platformProductId,
        description,
        imageUrl,
        couponLink: couponLink || null,
        price: price ? parseFloat(price) : null,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        links: links ? {
          create: links
        } : undefined,
        productLinks: productLinks ? {
          create: productLinks.map((link: any) => ({
            platform: link.platform,
            sourceUrl: link.sourceUrl,
            affiliateUrl: link.affiliateUrl,
            generatedAffiliateUrl: link.generatedAffiliateUrl,
            isActive: link.isActive !== undefined ? link.isActive : true
          }))
        } : undefined,
        images: images ? {
          create: images.map((img: any, index: number) => ({
            url: img.url,
            isPrimary: img.isPrimary || false,
            order: img.order ?? index
          }))
        } : undefined
      },
      include: {
        links: true,
        productLinks: true,
        images: true
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
