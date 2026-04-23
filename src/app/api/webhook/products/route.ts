import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

export async function POST(request: Request) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. API key inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.name || !body.category || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        description: body.description || null,
        imageUrl: body.imageUrl,
        price: body.price ? parseFloat(body.price) : null,
        originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
        status: body.status || 'pending', // Permite definir status customizado
        links: body.links ? {
          create: {
            amazon: body.links.amazon || null,
            mercadoLivre: body.links.mercadoLivre || null,
            shopee: body.links.shopee || null,
            aliexpress: body.links.aliexpress || null,
            tiktok: body.links.tiktok || null,
            netshoes: body.links.netshoes || null,
            magalu: body.links.magalu || null,
            kabum: body.links.kabum || null,
          }
        } : undefined
      },
      include: {
        links: true
      }
    });

    // Log para debug
    console.log('✅ Produto criado:', {
      id: product.id,
      name: product.name,
      hasId: !!product.id,
      allKeys: Object.keys(product)
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        price: product.price,
        originalPrice: product.originalPrice,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        links: product.links
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar produto via webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}

// Endpoint para criar múltiplos produtos de uma vez
export async function PUT(request: Request) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. API key inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    if (!Array.isArray(body.products)) {
      return NextResponse.json(
        { error: 'Esperado um array de produtos' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const productData of body.products) {
      try {
        const product = await prisma.product.create({
          data: {
            name: productData.name,
            category: productData.category,
            description: productData.description || null,
            imageUrl: productData.imageUrl,
            price: productData.price ? parseFloat(productData.price) : null,
            originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
            status: productData.status || 'pending', // Permite definir status customizado
            links: productData.links ? {
              create: {
                amazon: productData.links.amazon || null,
                mercadoLivre: productData.links.mercadoLivre || null,
                shopee: productData.links.shopee || null,
                aliexpress: productData.links.aliexpress || null,
                tiktok: productData.links.tiktok || null,
                netshoes: productData.links.netshoes || null,
                magalu: productData.links.magalu || null,
                kabum: productData.links.kabum || null,
              }
            } : undefined
          },
          include: {
            links: true
          }
        });
        results.push(product);
      } catch (error) {
        errors.push({
          product: productData.name,
          error: 'Erro ao criar produto'
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errorsCount: errors.length,
      results,
      errors
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar produtos em lote:', error);
    return NextResponse.json(
      { error: 'Erro ao processar produtos' },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar LINKS de um produto específico (Usado pelo Robô Telegram)
export async function PATCH(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. API key inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId, platform, link } = body;

    if (!productId || !platform || !link) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: productId, platform, link' },
        { status: 400 }
      );
    }

    // O Prisma espera a chave correta no update
    const validPlatforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Plataforma inválida. Use uma de: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Primeiro certificamos que o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { links: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Atualiza ou cria a entidade Link associada a este produto
    let updatedLinks;
    if (product.links) {
      updatedLinks = await prisma.link.update({
        where: { productId: productId },
        data: {
          [platform]: link
        }
      });
    } else {
      updatedLinks = await prisma.link.create({
        data: {
          productId: productId,
          [platform]: link
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Link da ${platform} atualizado com sucesso!`,
      links: updatedLinks
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao atualizar link de produto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar link do produto' },
      { status: 500 }
    );
  }
}

