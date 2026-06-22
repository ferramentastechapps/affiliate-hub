import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const { name, email, platform, channelName, trackingCode, commissionRate, notes, isActive } = await request.json();

    // Valida código único se for alterado
    const existing = await prisma.partner.findUnique({ where: { trackingCode } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Este código de rastreio já está em uso por outro parceiro.' }, { status: 400 });
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name,
        email,
        platform,
        channelName,
        trackingCode,
        commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : undefined,
        notes,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    
    // Soft delete
    await prisma.partner.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
