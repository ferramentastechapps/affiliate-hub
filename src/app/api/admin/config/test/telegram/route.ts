import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN não configurado no .env do servidor.' });
    }

    const config = await prisma.systemConfig.findUnique({ where: { key: 'telegram_channel_id' } });
    let channelId = config?.value || process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_PROMO_GROUP_ID;

    if (!channelId) {
      return NextResponse.json({ success: false, error: 'ID do canal Telegram não configurado.' });
    }

    // Faz um getChat na API do telegram
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`);
    const data = await res.json();

    if (data.ok && data.result) {
      return NextResponse.json({ success: true, channelName: data.result.title || data.result.username || channelId });
    } else {
      return NextResponse.json({ success: false, error: data.description || 'Erro desconhecido na API do Telegram.' });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' });
  }
}
