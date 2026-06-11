import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';
import { generateAffiliateLink } from '@/lib/affiliate';

async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  let hasAffiliate = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const generated = await generateAffiliateLink(originalUrl);
        if (generated) {
          generatedLinks[platform] = generated;
          hasAffiliate = true;
        } else {
          generatedLinks[platform] = originalUrl;
        }
      } catch (e) {
        console.error(`Erro ao gerar link de afiliado para ${platform}:`, e);
        generatedLinks[platform] = originalUrl;
      }
    }
  }

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    status: hasAffiliate ? 'active' : 'pending'
  };
}

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

    // Verificar se já existe um produto com o mesmo nome criado recentemente (últimas 24 horas)
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: body.name,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas
        }
      },
      include: {
        links: true
      }
    });

    if (existingProduct) {
      console.log('ℹ️ Produto duplicado detectado (mesmo nome nas últimas 24h):', body.name);
      return NextResponse.json({
        success: true,
        message: 'Produto já cadastrado recentemente (evitando duplicata)',
        product: {
          id: existingProduct.id,
          name: existingProduct.name,
          category: existingProduct.category,
          description: existingProduct.description,
          imageUrl: existingProduct.imageUrl,
          price: existingProduct.price,
          originalPrice: existingProduct.originalPrice,
          status: existingProduct.status,
          createdAt: existingProduct.createdAt,
          updatedAt: existingProduct.updatedAt,
          links: existingProduct.links
        }
      }, { status: 200 });
    }

    const { links: processedLinks, status: processedStatus } = await processProductAffiliates(body);
    const finalStatus = body.status || processedStatus;

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        description: body.description || null,
        imageUrl: body.imageUrl,
        price: body.price ? parseFloat(body.price) : null,
        originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
        status: finalStatus,
        links: processedLinks ? {
          create: {
            amazon: processedLinks.amazon || null,
            mercadoLivre: processedLinks.mercadoLivre || null,
            shopee: processedLinks.shopee || null,
            aliexpress: processedLinks.aliexpress || null,
            tiktok: processedLinks.tiktok || null,
            netshoes: processedLinks.netshoes || null,
            magalu: processedLinks.magalu || null,
            kabum: processedLinks.kabum || null,
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
        // Verificar se já existe um produto com o mesmo nome criado recentemente (últimas 24 horas)
        const existingProduct = await prisma.product.findFirst({
          where: {
            name: productData.name,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas
            }
          },
          include: {
            links: true
          }
        });

        if (existingProduct) {
          results.push(existingProduct);
          continue;
        }

        const { links: processedLinks, status: processedStatus } = await processProductAffiliates(productData);
        const finalStatus = productData.status || processedStatus;

        const product = await prisma.product.create({
          data: {
            name: productData.name,
            category: productData.category,
            description: productData.description || null,
            imageUrl: productData.imageUrl,
            price: productData.price ? parseFloat(productData.price) : null,
            originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
            status: finalStatus,
            links: processedLinks ? {
              create: {
                amazon: processedLinks.amazon || null,
                mercadoLivre: processedLinks.mercadoLivre || null,
                shopee: processedLinks.shopee || null,
                aliexpress: processedLinks.aliexpress || null,
                tiktok: processedLinks.tiktok || null,
                netshoes: processedLinks.netshoes || null,
                magalu: processedLinks.magalu || null,
                kabum: processedLinks.kabum || null,
              }
            } : undefined
          },
          include: {
            links: true
          }
        });
        results.push(product);
      } catch {
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

