import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { expiresAt: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        code: true,
        description: true,
        discount: true,
        platform: true,
        expiresAt: true,
        isActive: true,
        minPurchaseValue: true,
        maxDiscountValue: true,
        applicableCategories: true,
      },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.code || !body.description || !body.discount || !body.platform) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }
    
    // Converter expiresAt se existir
    if (body.expiresAt) {
      body.expiresAt = new Date(body.expiresAt);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description,
        discount: body.discount,
        platform: body.platform,
        productId: body.productId || null,
        expiresAt: body.expiresAt || null,
        minPurchaseValue: body.minPurchaseValue ? parseFloat(body.minPurchaseValue) : null,
        maxDiscountValue: body.maxDiscountValue ? parseFloat(body.maxDiscountValue) : null,
        applicableCategories: body.applicableCategories || null,
        isActive: true,
      }
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cupom' },
      { status: 500 }
    );
  }
}
