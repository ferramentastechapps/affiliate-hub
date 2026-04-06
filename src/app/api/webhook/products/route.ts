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
        links: body.links ? {
          create: {
            amazon: body.links.amazon || null,
            mercadoLivre: body.links.mercadoLivre || null,
            shopee: body.links.shopee || null,
            aliexpress: body.links.aliexpress || null,
            tiktok: body.links.tiktok || null,
          }
        } : undefined
      },
      include: {
        links: true
      }
    });

    return NextResponse.json({
      success: true,
      product
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
            links: productData.links ? {
              create: {
                amazon: productData.links.amazon || null,
                mercadoLivre: productData.links.mercadoLivre || null,
                shopee: productData.links.shopee || null,
                aliexpress: productData.links.aliexpress || null,
                tiktok: productData.links.tiktok || null,
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
