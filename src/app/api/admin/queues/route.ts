import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import fs from 'fs';
import path from 'path';

const BOT_STATE_PATH = path.join(process.cwd(), 'bot', 'bot_state.json');

export async function GET(request: Request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fs.existsSync(BOT_STATE_PATH)) {
      return NextResponse.json({
        fila_lifestyle: [],
        fila_sem_lifestyle: [],
        fila_manual: [],
        ultimo_envio_grupo: 0
      });
    }

    const stateData = fs.readFileSync(BOT_STATE_PATH, 'utf-8');
    const state = JSON.parse(stateData);

    return NextResponse.json({
      fila_lifestyle: state.fila_lifestyle || [],
      fila_sem_lifestyle: state.fila_sem_lifestyle || [],
      fila_manual: state.fila_manual || [],
      ultimo_envio_grupo: state.ultimo_envio_grupo || 0
    });
  } catch (error) {
    console.error('Error reading bot_state.json:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
