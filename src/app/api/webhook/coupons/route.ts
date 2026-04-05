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
    if (!body.code || !body.description || !body.discount || !body.platform) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: code, description, discount, platform' },
        { status: 400 }
      );
    }

    // Criar cupom
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description,
        discount: body.discount,
        platform: body.platform,
        productId: body.productId || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    });

    return NextResponse.json({
      success: true,
      coupon
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar cupom via webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cupom' },
      { status: 500 }
    );
  }
}

// Endpoint para criar múltiplos cupons de uma vez
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
    
    if (!Array.isArray(body.coupons)) {
      return NextResponse.json(
        { error: 'Esperado um array de cupons' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const couponData of body.coupons) {
      try {
        const coupon = await prisma.coupon.create({
          data: {
            code: couponData.code.toUpperCase(),
            description: couponData.description,
            discount: couponData.discount,
            platform: couponData.platform,
            productId: couponData.productId || null,
            expiresAt: couponData.expiresAt ? new Date(couponData.expiresAt) : null,
            isActive: couponData.isActive !== undefined ? couponData.isActive : true
          }
        });
        results.push(coupon);
      } catch (error) {
        errors.push({
          coupon: couponData.code,
          error: 'Erro ao criar cupom'
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errors: errors.length,
      results,
      errors
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar cupons em lote:', error);
    return NextResponse.json(
      { error: 'Erro ao processar cupons' },
      { status: 500 }
    );
  }
}
