import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(coupons);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, description, discount, platform, productId, expiresAt } = body;
    
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discount,
        platform,
        productId: productId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    
    return NextResponse.json(coupon);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 });
  }
}
