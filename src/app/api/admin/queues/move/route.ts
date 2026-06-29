import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const BOT_STATE_PATH = path.join(process.cwd(), 'bot', 'bot_state.json');

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const payload = sessionToken ? verifyToken(sessionToken) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, fromQueue, toQueue } = body;

    if (!productId || !fromQueue || !toQueue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!fs.existsSync(BOT_STATE_PATH)) {
      return NextResponse.json({ error: 'Bot state not found' }, { status: 404 });
    }

    const stateData = fs.readFileSync(BOT_STATE_PATH, 'utf-8');
    const state = JSON.parse(stateData);

    const fromArray = state[fromQueue] || [];
    const itemIndex = fromArray.findIndex((item: any) => item?.produto?.id === productId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Product not found in source queue' }, { status: 404 });
    }

    const item = fromArray[itemIndex];

    if (toQueue === 'fila_lifestyle') {
      const enhanced = item?.produto?.enhancedImageUrl;
      if (!enhanced || enhanced.includes('placeholder') || enhanced.trim() === '') {
        return NextResponse.json({ error: 'Cannot move to lifestyle queue without valid enhancedImageUrl' }, { status: 400 });
      }
    }

    // Move
    fromArray.splice(itemIndex, 1);
    if (!state[toQueue]) state[toQueue] = [];
    
    // Update added_at when moving
    item.added_at = Date.now() / 1000;
    
    state[toQueue].push(item);
    state[fromQueue] = fromArray;

    fs.writeFileSync(BOT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Moved successfully' });
  } catch (error) {
    console.error('Error moving in bot_state.json:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
