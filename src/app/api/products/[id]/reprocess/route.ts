import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !verifyToken(sessionToken)) {
      return NextResponse.json({ error: 'Não Autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { ai, affiliate } = body;

    const data: any = {};
    if (ai) {
      data.aiProcessed = false;
      data.aiProcessedAt = null;
    }
    if (affiliate) {
      data.affiliateProcessed = false;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhuma ação solicitada' }, { status: 400 });
    }

    await prisma.product.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, message: 'Reprocessamento agendado em background' }, { status: 202 });
  } catch (error: any) {
    console.error('Erro ao solicitar reprocessamento:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
