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

const BOT_PROCESS_NAME = 'affiliate-scraper';

function getPm2Status() {
  try {
    const raw = execSync('pm2 jlist', { encoding: 'utf-8', timeout: 10000 });
    const list = JSON.parse(raw) as Array<{
      name: string;
      pm2_env: {
        status: string;
        pm_uptime: number;
        restart_time: number;
        created_at: number;
      };
    }>;
    const proc = list.find((p) => p.name === BOT_PROCESS_NAME);
    if (!proc) return null;

    const uptimeMs = proc.pm2_env.status === 'online'
      ? Date.now() - proc.pm2_env.pm_uptime
      : 0;

    return {
      pm2Status: proc.pm2_env.status,
      status: proc.pm2_env.status === 'online' ? 'online' : proc.pm2_env.status === 'errored' ? 'error' : 'offline',
      uptime: Math.floor(uptimeMs / 1000),
      restarts: proc.pm2_env.restart_time,
      startedAt: new Date(proc.pm2_env.created_at).toISOString(),
    };
  } catch {
    return null;
  }
}

function getPm2Logs(): string[] {
  try {
    const raw = execSync(
      `pm2 logs ${BOT_PROCESS_NAME} --lines 20 --nostream --raw`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    return raw.split('\n').filter(Boolean).slice(-20);
  } catch {
    return ['Logs não disponíveis'];
  }
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const pm2 = getPm2Status();
  const recentLogs = getPm2Logs();

  if (!pm2) {
    return NextResponse.json({
      status: 'offline',
      pm2Status: 'not_found',
      uptime: 0,
      lastRun: null,
      productsScrapedToday: 0,
      recentLogs,
      error: `Processo "${BOT_PROCESS_NAME}" não encontrado no PM2`,
    });
  }

  return NextResponse.json({
    ...pm2,
    lastRun: pm2.startedAt,
    productsScrapedToday: 0,
    recentLogs,
  });
}
