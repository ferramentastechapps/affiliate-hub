import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { execSync } from 'child_process';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload) return null;
  return payload;
}

const BOT_PROCESS_NAME = 'affiliate-scraper';

type BotAction = 'restart' | 'stop' | 'start' | 'force-scrape';

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Apenas admins podem controlar o bot
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem controlar o bot' }, { status: 403 });
  }

  const { action } = (await request.json()) as { action: BotAction };
  const validActions: BotAction[] = ['restart', 'stop', 'start', 'force-scrape'];

  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  try {
    let result = '';

    if (action === 'force-scrape') {
      result = execSync(`pm2 restart ${BOT_PROCESS_NAME}`, {
        encoding: 'utf-8',
        timeout: 15000,
      });
    } else {
      result = execSync(`pm2 ${action} ${BOT_PROCESS_NAME}`, {
        encoding: 'utf-8',
        timeout: 15000,
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: payload.id,
        action: `bot.${action}`,
        entityType: 'bot',
        entityId: BOT_PROCESS_NAME,
        details: JSON.stringify({ result: result.substring(0, 200) }),
      },
    });

    return NextResponse.json({ success: true, action, message: result.trim() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Falha ao executar ação no PM2', detail: message },
      { status: 500 }
    );
  }
}
