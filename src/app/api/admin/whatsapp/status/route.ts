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

function getPm2Status() {
  try {
    const raw = execSync('pm2 jlist', { encoding: 'utf-8', timeout: 5000 });
    const list = JSON.parse(raw) as Array<{
      name: string;
      pm2_env: {
        status: string;
        pm_uptime: number;
        restart_time: number;
        created_at: number;
      };
    }>;
    const proc = list.find((p) => p.name === PROCESS_NAME);
    if (!proc) return null;

    return {
      pm2Status: proc.pm2_env.status,
      pm2Restarts: proc.pm2_env.restart_time,
      pm2Uptime: proc.pm2_env.status === 'online' ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000) : 0,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const pm2Info = getPm2Status();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${WHATSAPP_API_URL}/status`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ...data,
        pm2: pm2Info || { pm2Status: 'unknown', pm2Restarts: 0, pm2Uptime: 0 },
        engineOnline: true,
      });
    }
  } catch (err: any) {
    // Service offline or non-responsive
  }

  return NextResponse.json({
    isReady: false,
    status: 'OFFLINE',
    qrCode: null,
    queueLength: 0,
    queue: [],
    lastFlushTime: null,
    lastError: pm2Info ? `Processo PM2 está em estado "${pm2Info.pm2Status}"` : 'Engine WhatsApp (porta 3006) inacessível',
    engineOnline: false,
    pm2: pm2Info || { pm2Status: 'not_found', pm2Restarts: 0, pm2Uptime: 0 },
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'critical',
        message: 'Serviço whatsapp-engine (porta 3006) inacessível.',
        details: pm2Info ? `Status PM2: ${pm2Info.pm2Status}` : 'Verifique se a aplicação Node do WhatsApp está rodando via PM2.',
      },
    ],
  });
}
