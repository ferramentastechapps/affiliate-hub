import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const BOT_STATE_PATH = path.join(process.cwd(), 'bot', 'bot_state.json');

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const payload = sessionToken ? verifyToken(sessionToken) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, queue, enhancedImageUrl, imageUrl } = body;

    if (!productId || !queue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!enhancedImageUrl && !imageUrl) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const dataToUpdate: any = { isFixed: true };
    if (enhancedImageUrl) dataToUpdate.enhancedImageUrl = enhancedImageUrl;
    if (imageUrl) dataToUpdate.imageUrl = imageUrl;

    // 1. Atualizar banco de dados
    const product = await prisma.product.update({
      where: { id: productId },
      data: dataToUpdate
    });

    if (!fs.existsSync(BOT_STATE_PATH)) {
      return NextResponse.json({ error: 'Bot state not found' }, { status: 404 });
    }

    // 2. Atualizar bot_state.json
    const stateData = fs.readFileSync(BOT_STATE_PATH, 'utf-8');
    const state = JSON.parse(stateData);

    const targetArray = state[queue] || [];
    const itemIndex = targetArray.findIndex((item: any) => item?.produto?.id === productId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Product not found in queue' }, { status: 404 });
    }

    const item = targetArray[itemIndex];
    if (enhancedImageUrl) item.produto.enhancedImageUrl = enhancedImageUrl;
    if (imageUrl) item.produto.imageUrl = imageUrl;
    item.produto.isFixed = true;

    // Se estava na fila_sem_lifestyle, mover para fila_lifestyle (somente se ganhou enhancedImageUrl!)
    if (queue === 'fila_sem_lifestyle' && enhancedImageUrl) {
      targetArray.splice(itemIndex, 1);
      state[queue] = targetArray;
      
      if (!state['fila_lifestyle']) state['fila_lifestyle'] = [];
      item.added_at = Date.now() / 1000;
      state['fila_lifestyle'].push(item);
    } else {
      state[queue][itemIndex] = item;
    }

    fs.writeFileSync(BOT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Photo updated successfully', product });
  } catch (error) {
    console.error('Error updating lifestyle photo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
