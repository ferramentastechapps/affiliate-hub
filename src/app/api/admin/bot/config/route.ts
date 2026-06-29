import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

const ENV_FILE = join(process.cwd(), '.env');
const BOT_PROCESS_NAME = 'affiliate-scraper';

const EDITABLE_KEYS = [
  'SEARCH_INTERVAL_MINUTES',
  'TELEGRAM_POST_INTERVAL_MINUTES',
  'MIN_QUALITY_SCORE',
  'MIN_DISCOUNT_PERCENT',
];

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

function setEnvKey(content: string, key: string, value: string): string {
  const regex = new RegExp(`^(${key}=.*)$`, 'm');
  const newLine = `${key}="${value}"`;
  if (regex.test(content)) {
    return content.replace(regex, newLine);
  }
  return content + `\n${newLine}`;
}

export async function GET() {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (!existsSync(ENV_FILE)) {
    return NextResponse.json({ error: '.env não encontrado' }, { status: 404 });
  }

  const content = readFileSync(ENV_FILE, 'utf-8');
  const all = parseEnv(content);

  const filtered: Record<string, string> = {};
  for (const key of EDITABLE_KEYS) {
    filtered[key] = all[key] ?? '';
  }

  return NextResponse.json({ config: filtered });
}

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { updates } = await request.json() as { updates: Record<string, string> };

  for (const key of Object.keys(updates)) {
    if (!EDITABLE_KEYS.includes(key)) {
      return NextResponse.json({ error: `Chave não permitida: ${key}` }, { status: 400 });
    }
  }

  if (!existsSync(ENV_FILE)) {
    return NextResponse.json({ error: '.env não encontrado' }, { status: 404 });
  }

  let content = readFileSync(ENV_FILE, 'utf-8');
  for (const [key, value] of Object.entries(updates)) {
    content = setEnvKey(content, key, value);
  }
  writeFileSync(ENV_FILE, content, 'utf-8');

  try {
    execSync(`pm2 restart ${BOT_PROCESS_NAME}`, { timeout: 15000 });
  } catch {
    return NextResponse.json({
      success: true,
      warning: 'Configurações salvas, mas falha ao reiniciar o bot via PM2.',
    });
  }

  return NextResponse.json({ success: true, message: 'Configurações salvas e bot reiniciado.' });
}
