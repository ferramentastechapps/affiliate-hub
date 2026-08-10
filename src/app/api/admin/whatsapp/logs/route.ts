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

const PROCESS_NAME = 'whatsapp-engine';
const WHATSAPP_API_URL = process.env.WHATSAPP_ENGINE_URL || 'http://127.0.0.1:3006';

function getPm2RawLogs(): string[] {
  try {
    const raw = execSync(`pm2 logs ${PROCESS_NAME} --lines 50 --nostream --raw`, { encoding: 'utf-8', timeout: 5000 });
    return raw.split('\n').filter(Boolean).slice(-50);
  } catch {
    return ['PM2 logs não disponíveis'];
  }
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const pm2Logs = getPm2RawLogs();
  let engineLogs: any[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${WHATSAPP_API_URL}/logs`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      engineLogs = data.logs || [];
    }
  } catch {
    // service offline
  }

  return NextResponse.json({
    engineLogs,
    pm2Logs,
  });
}
