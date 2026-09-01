import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userId   = searchParams.get('userId');

    if (!endpoint && !userId) {
      return NextResponse.json({ error: 'Forneça endpoint ou userId' }, { status: 400 });
    }

    let subscription = null;

    // 1ª tentativa: busca pela subscription do endpoint
    if (endpoint) {
      subscription = await prisma.pushSubscription.findUnique({
        where: { endpoint },
        select: { preferences: true },
      });
    }

    // 2ª tentativa (fallback): busca a subscription mais recente do usuário
    if (!subscription && userId) {
      subscription = await prisma.pushSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { preferences: true },
      });
    }

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription não encontrada' }, { status: 404 });
    }

    // Retorna as preferências ou um padrão se for antiga sem prefs
    const prefs = subscription.preferences || { all: true, categories: [] };

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { endpoint, userId, preferences } = await request.json();

    if (!preferences) {
      return NextResponse.json({ error: 'Preferências ausentes' }, { status: 400 });
    }

    if (!endpoint && !userId) {
      return NextResponse.json({ error: 'Forneça endpoint ou userId' }, { status: 400 });
    }

    let subscription = null;

    // 1ª tentativa: atualiza pelo endpoint
    if (endpoint) {
      try {
        subscription = await prisma.pushSubscription.update({
          where: { endpoint },
          data: { 
            preferences,
            userId: userId || undefined 
          },
        });
      } catch {
        // Se o endpoint não existe (subscription perdida), tenta fallback pelo userId
        if (userId) {
          await prisma.pushSubscription.updateMany({
            where: { userId },
            data: { preferences },
          });
          subscription = await prisma.pushSubscription.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          });
        }
      }
    } else if (userId) {
      // Sem endpoint: atualiza TODAS as subscriptions do usuário
      await prisma.pushSubscription.updateMany({
        where: { userId },
        data: { preferences },
      });
      subscription = await prisma.pushSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!subscription) {
      // Nenhuma subscription encontrada — retorna 200 mesmo assim pois o
      // localStorage já salvou localmente. A subscription será criada quando
      // o usuário ativar as notificações.
      return NextResponse.json({ success: true, persisted: false });
    }

    return NextResponse.json({ success: true, persisted: true, preferences: subscription.preferences });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
