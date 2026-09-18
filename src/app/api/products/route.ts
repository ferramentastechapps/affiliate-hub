import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const AFFILIATE_PLATFORM_KEYS = [
  'amazon',
  'mercadoLivre',
  'shopee',
  'aliexpress',
  'tiktok',
  'netshoes',
  'magalu',
  'kabum',
] as const;

function hasValidAffiliateLink(product: any): boolean {
  const hasPlatformLink = product.productLinks?.some(
    (link: any) => link.affiliateUrl || link.generatedAffiliateUrl
  );
  const hasOldLink = product.links && AFFILIATE_PLATFORM_KEYS.some((key) => product.links[key]);
  return Boolean(hasPlatformLink || hasOldLink);
}

function calculateProductHotScore(p: any): {
  hotScore: number;
  isLowestPriceEver: boolean;
  hasCoupon: boolean;
} {
  const hasCoupon = p.coupons.length > 0;
  const aiScore = p.aiScore ?? 0;

  let isLowestPriceEver = false;
  let dropFromOriginal = 0;
  if (p.price && p.originalPrice && p.originalPrice > p.price) {
    dropFromOriginal = ((p.originalPrice - p.price) / p.originalPrice) * 100;
  }
  if (p.priceHistory && p.priceHistory.length > 0) {
    const histMinPrice = Math.min(...p.priceHistory.map((h: any) => h.price));
    if (p.price && p.price <= histMinPrice * 1.01) {
      isLowestPriceEver = true;
    }
  }

  const hoursSinceCreation = p.createdAt
    ? (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60)
    : 999;
  const freshnessScore = Math.max(0, 10 - (hoursSinceCreation / (7 * 24)) * 10);

  const rawScore =
    (aiScore * 2) +
    (isLowestPriceEver ? 25 : 0) +
    (hasCoupon ? 15 : 0) +
    Math.min(dropFromOriginal * 0.5, 15) +
    freshnessScore;

  return {
    hotScore: Math.round(rawScore * 10) / 10,
    isLowestPriceEver,
    hasCoupon,
  };
}

function calculatePriceDropMetrics(
  price: number | null | undefined,
  priceHistory?: Array<{ price: number; createdAt: Date }>
): { dropPercent: number; lowestPrice30d: number; highestPrice30d: number } {
  let dropPercent = 0;
  let lowestPrice30d = price ?? 0;
  let highestPrice30d = price ?? 0;

  if (priceHistory && priceHistory.length > 0) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const history30d = priceHistory.filter((h) => h.createdAt >= thirtyDaysAgo);

    if (history30d.length > 0) {
      const prices = history30d.map((h) => h.price).filter(Boolean) as number[];
      lowestPrice30d = Math.min(...prices, price || Infinity);
      highestPrice30d = Math.max(...prices, price || 0);

      if (price && highestPrice30d > 0) {
        dropPercent = ((highestPrice30d - price) / highestPrice30d) * 100;
      }
    }
  }

  return {
    dropPercent: Math.round(dropPercent * 10) / 10,
    lowestPrice30d,
    highestPrice30d,
  };
}

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

    const searchParam = searchParams.get('search') || searchParams.get('q');
    const categoryParam = searchParams.get('category');
    const storeParam = searchParams.get('store');

    if (categoryParam && categoryParam !== 'Todas') {
      whereClause.category = categoryParam;
    }

    if (storeParam) {
      const storeMap: Record<string, string> = {
        amazon: 'amazon',
        mercadolivre: 'mercadoLivre',
        shopee: 'shopee',
        aliexpress: 'aliexpress',
        tiktok: 'tiktok',
        kabum: 'kabum',
        magalu: 'magalu',
        netshoes: 'netshoes'
      };
      const platformKey = storeMap[storeParam];
      if (platformKey) {
        const storeCondition = {
          OR: [
            { links: { [platformKey]: { not: null, notIn: [''] } } },
            { productLinks: { some: { platform: platformKey, isActive: true } } }
          ]
        };
        if (whereClause.AND) {
          whereClause.AND.push(storeCondition);
        } else {
          whereClause.AND = [storeCondition];
        }
      }
    }

    if (searchParam) {
      if (searchParam.toUpperCase() === 'CUPOM') {
        whereClause.coupons = {
          some: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          }
        };
      } else {
        const terms = searchParam.toLowerCase().split(/\s+/).filter(Boolean);
        if (terms.length > 0) {
          const searchConditions = terms.map(term => ({
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { category: { contains: term, mode: 'insensitive' } },
              { brand: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          }));
          whereClause.AND = whereClause.AND ? [...whereClause.AND, ...searchConditions] : searchConditions;
        }
      }
    }

    const filterParam = searchParams.get('filter');
    const userIdParam = searchParams.get('userId');
    let orderByClause: any = { createdAt: 'desc' };

    if (filterParam === 'baratinho') {
      whereClause.price = { lte: 50, gt: 0 };
    } else if (filterParam === 'menorPreco') {
      whereClause.price = { gt: 0 };
      orderByClause = { price: 'asc' };
    } else if (filterParam === 'emAlta' || filterParam === 'pontuados') {
      orderByClause = { clicks: 'desc' };
    } else if (filterParam === 'destaques') {
      // Ordenar por aiScore desc como proxy para hot deal (hotScore é calculado no map)
      orderByClause = { aiScore: 'desc' };
    } else if (filterParam === 'alertas') {
      const keywordsParam = searchParams.get('keywords');
      const categoriesParam = searchParams.get('categories');
      const endpointParam = searchParams.get('endpoint');
      
      let pushCategories: string[] = [];
      let pushKeywords: string[] = [];
      
      if (keywordsParam) {
        pushKeywords.push(...keywordsParam.split(',').map(k => k.trim()).filter(Boolean));
      }
      if (categoriesParam) {
        pushCategories.push(...categoriesParam.split(',').map(c => c.trim()).filter(Boolean));
      }

      if (endpointParam) {
        const epSub = await prisma.pushSubscription.findUnique({
          where: { endpoint: endpointParam }
        });
        if (epSub?.preferences) {
          const p = epSub.preferences as any;
          if (Array.isArray(p.categories)) pushCategories.push(...p.categories);
          if (Array.isArray(p.customInterests)) pushKeywords.push(...p.customInterests);
        }
      }

      if (userIdParam) {
        const pushSubs = await prisma.pushSubscription.findMany({
          where: { userId: userIdParam }
        });
        for (const sub of pushSubs) {
          if (sub.preferences) {
            const prefs = sub.preferences as any;
            if (Array.isArray(prefs.categories)) pushCategories.push(...prefs.categories);
            if (Array.isArray(prefs.customInterests)) pushKeywords.push(...prefs.customInterests);
          }
        }
      }

      const uniqueCategories = [...new Set(pushCategories)];
      const uniqueKeywords = [...new Set(pushKeywords)];
      
      const orConditions: any[] = [];
      
      if (uniqueCategories.length > 0) {
        orConditions.push({ category: { in: uniqueCategories } });
      }
      if (userIdParam) {
        orConditions.push({ alerts: { some: { userId: userIdParam } } });
      }
      for (const kw of uniqueKeywords) {
        orConditions.push({ name: { contains: kw, mode: 'insensitive' } });
        orConditions.push({ description: { contains: kw, mode: 'insensitive' } });
      }

      if (orConditions.length > 0) {
        whereClause.OR = orConditions;
      } else {
        // Se o usuário ainda não cadastrou alertas específicos, mostra os destaques mais relevantes
        whereClause.status = { in: ['active', 'approved'] };
        orderByClause = { clicks: 'desc' };
      }
    } else if (filterParam === 'price-drops') {
      // FASE 2 — Filtro de produtos com queda de preço
      // Buscar produtos ativos com histórico de preços
      whereClause.status = { in: ['active', 'approved'] };
      whereClause.price = { not: null };
      whereClause.priceHistory = { some: {} }; // Tem que ter histórico
      
      orderByClause = { updatedAt: 'desc' }; // Mais recentes primeiro
    }

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 200;

    const products = await prisma.product.findMany({
      where: whereClause,
      take: limit,
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
        priceHistory: {
          orderBy: { createdAt: 'desc' as const },
          take: filterParam === 'price-drops' ? 50 : 20 // Mais registros para price-drops, menos para hotScore
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: orderByClause
    });

    const mappedProducts = products.map(p => {
      const likes = p.votes.filter(v => v.type === 'LIKE').length;
      const dislikes = p.votes.filter(v => v.type === 'DISLIKE').length;
      const { hotScore, isLowestPriceEver, hasCoupon } = calculateProductHotScore(p);
      const priceDropMetrics = filterParam === 'price-drops'
        ? calculatePriceDropMetrics(p.price, p.priceHistory)
        : null;

      return {
        ...p,
        _count: {
          ...p._count,
          likes,
          dislikes
        },
        hotScore,
        isLowestPriceEver,
        hasCoupon,
        ...(priceDropMetrics && priceDropMetrics)
      };
    });

    // Se for price-drops, filtrar apenas produtos com queda real e ordenar por maior queda
    let finalProducts = mappedProducts;

    // Oculta produtos sem link de afiliado no site (mas não no painel admin, onde status=all ou pending)
    if (statusParam !== 'all' && statusParam !== 'pending') {
      finalProducts = finalProducts.filter(hasValidAffiliateLink);
    }

    if (filterParam === 'price-drops') {
      finalProducts = finalProducts
        .filter((p: any) => p.dropPercent > 0)
        .sort((a: any, b: any) => b.dropPercent - a.dropPercent);
    } else if (filterParam === 'destaques') {
      // Ordenar por hotScore composto (calculado no map acima)
      finalProducts = finalProducts.sort((a: any, b: any) => (b.hotScore ?? 0) - (a.hotScore ?? 0));
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
    const { name, category, description, imageUrl, enhancedImageUrl, price, originalPrice, links, brand, subcategory, platformProductId, productLinks, images, couponLink } = body;
    
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
        enhancedImageUrl: enhancedImageUrl !== undefined ? enhancedImageUrl : imageUrl,
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
