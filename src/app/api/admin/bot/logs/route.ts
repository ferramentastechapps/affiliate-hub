import { NextResponse } from 'next/server';
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

type LogLevel = 'critical' | 'warning' | 'info';

interface ParsedLog {
  raw: string;
  level: LogLevel;
  timestamp: string | null;
  message: string;
}

const CRITICAL_PATTERNS = [
  /erro fatal/i,
  /fatal error/i,
  /traceback/i,
  /exception/i,
  /❌.*erro/i,
  /processo.*parou/i,
  /crash/i,
  /killed/i,
  /exit code [^0]/i,
];

const WARNING_PATTERNS = [
  /429/i,
  /timeout/i,
  /falha ao/i,
  /⚠️/,
  /aviso/i,
  /warning/i,
  /rate.?limit/i,
  /too many requests/i,
  /conexão recusada/i,
  /connection refused/i,
  /retry/i,
];

function classifyLine(line: string): LogLevel {
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(line)) return 'critical';
  }
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(line)) return 'warning';
  }
  return 'info';
}

function extractTimestamp(line: string): string | null {
  const match = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/) ||
                line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/) ||
                line.match(/\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : null;
}

function parseLines(raw: string): ParsedLog[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => ({
      raw: line,
      level: classifyLine(line),
      timestamp: extractTimestamp(line),
      message: line.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\s*/, '').trim(),
    }));
}

export async function GET() {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let outLogs = '';
  let errLogs = '';

  try {
    outLogs = execSync(
      `pm2 logs ${BOT_PROCESS_NAME} --lines 150 --nostream --raw`,
      { encoding: 'utf-8', timeout: 12000 }
    );
  } catch {
    outLogs = '';
  }

  try {
    errLogs = execSync(
      `pm2 logs ${BOT_PROCESS_NAME} --err --lines 50 --nostream --raw`,
      { encoding: 'utf-8', timeout: 12000 }
    );
  } catch {
    errLogs = '';
  }

  const allLines = parseLines(outLogs + '\n' + errLogs);

  return NextResponse.json({
    critical: allLines.filter(l => l.level === 'critical').slice(-30),
    warning: allLines.filter(l => l.level === 'warning').slice(-50),
    info: allLines.filter(l => l.level === 'info').slice(-100),
    total: allLines.length,
  });
}
