import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { publishToGroup } from '@/lib/telegram';

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

    // Buscar do bot_state.json para pegar platform e affiliate_link
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

    const item = targetArray[itemIndex];
    const { platform, affiliate_link } = item;

    // Buscar produto atualizado do banco
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!dbProduct) {
      return NextResponse.json({ error: 'Product not found in database' }, { status: 404 });
    }

    const enhanced = dbProduct.enhancedImageUrl;
    if (!enhanced || enhanced.includes('placeholder') || enhanced.trim() === '') {
      return NextResponse.json({ error: 'Cannot publish without valid enhancedImageUrl' }, { status: 400 });
    }

    // Publicar no grupo (ignora timestamp de 5 min)
    const success = await publishToGroup(dbProduct, platform, affiliate_link);

    if (success) {
      // Remover da fila
      targetArray.splice(itemIndex, 1);
      state[queue] = targetArray;
      
      // Atualizar timestamp (opcional, para resetar os 5 min da fila automática)
      state['ultimo_envio_grupo'] = Date.now() / 1000;

      fs.writeFileSync(BOT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
      
      return NextResponse.json({ success: true, message: 'Published successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to publish to Telegram' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error publishing from queue:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
