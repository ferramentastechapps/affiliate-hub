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
