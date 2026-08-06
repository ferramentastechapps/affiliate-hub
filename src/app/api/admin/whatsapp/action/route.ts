import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { execSync } from 'child_process';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

const WHATSAPP_API_URL = process.env.WHATSAPP_ENGINE_URL || 'http://localhost:3006';

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Ação não informada' }, { status: 400 });
    }

    if (action === 'pm2-restart') {
      try {
        execSync('pm2 restart whatsapp-engine', { encoding: 'utf-8', timeout: 10000 });
        return NextResponse.json({ success: true, message: 'Processo whatsapp-engine reiniciado via PM2' });
      } catch (err: any) {
        return NextResponse.json({ error: `Falha ao reiniciar PM2: ${err.message}` }, { status: 500 });
      }
    }

    let targetEndpoint = '';
    if (action === 'reconnect') targetEndpoint = '/reconnect';
    else if (action === 'reset-session') targetEndpoint = '/reset-session';
    else if (action === 'flush') targetEndpoint = '/flush';
    else {
      return NextResponse.json({ error: `Ação inválida: ${action}` }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${WHATSAPP_API_URL}${targetEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Erro na execução da ação' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: `Erro de comunicação com o WhatsApp Engine: ${err.message}` }, { status: 500 });
  }
}
