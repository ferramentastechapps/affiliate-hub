import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint não fornecido' }, { status: 400 });
    }

    const subscription = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { preferences: true }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription não encontrada' }, { status: 404 });
    }

    // Retorna as preferências ou um padrão "all: true" se for antiga sem prefs
    const prefs = subscription.preferences || { all: true, categories: [] };

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { endpoint, preferences } = await request.json();

    if (!endpoint || !preferences) {
      return NextResponse.json({ error: 'Endpoint ou preferências ausentes' }, { status: 400 });
    }

    const subscription = await prisma.pushSubscription.update({
      where: { endpoint },
      data: { preferences }
    });

    return NextResponse.json({ success: true, preferences: subscription.preferences });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
