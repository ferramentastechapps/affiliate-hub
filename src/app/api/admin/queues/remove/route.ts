import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import fs from 'fs';
import path from 'path';

const BOT_STATE_PATH = path.join(process.cwd(), 'bot', 'bot_state.json');

export async function POST(request: Request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, queue } = body;

    if (!productId || !queue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!fs.existsSync(BOT_STATE_PATH)) {
      return NextResponse.json({ error: 'Bot state not found' }, { status: 404 });
    }

    const stateData = fs.readFileSync(BOT_STATE_PATH, 'utf-8');
    const state = JSON.parse(stateData);

    const targetArray = state[queue] || [];
    const itemIndex = targetArray.findIndex((item: any) => item?.produto?.id === productId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Product not found in queue' }, { status: 404 });
    }

    // Remove
    targetArray.splice(itemIndex, 1);
    state[queue] = targetArray;

    fs.writeFileSync(BOT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Removed successfully' });
  } catch (error) {
    console.error('Error removing from bot_state.json:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
