import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany();
    
    // Convert to simple key-value object
    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    // Default values if not set
    return NextResponse.json({
      configs: {
        bot_interval: configMap['bot_interval'] || '30',
        auto_approve_score: configMap['auto_approve_score'] || '70',
        ai_enabled: configMap['ai_enabled'] || 'true',
        telegram_channel_id: configMap['telegram_channel_id'] || '',
        whatsapp_api_url: configMap['whatsapp_api_url'] || '',
        whatsapp_api_token: configMap['whatsapp_api_token'] || '',
        min_discount_percent: configMap['min_discount_percent'] || '5',
        max_products_per_run: configMap['max_products_per_run'] || '50',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const updates = await request.json();
    
    // Lista de chaves restritas de backend/env (NUNCA permitir alteração via API)
    const BLOCKED_KEYS = [
      'DATABASE_URL', 
      'JWT_SECRET', 
      'TELEGRAM_BOT_TOKEN', 
      'NEXT_PUBLIC_VAPID_KEY', 
      'VAPID_PRIVATE_KEY', 
      'OPENROUTER_API_KEY', 
      'GOOGLE_AI_API_KEY', 
      'GOOGLE_CLIENT_ID', 
      'GOOGLE_CLIENT_SECRET'
    ];

    const keysToUpdate = Object.keys(updates);
    
    // Verifica se tentaram atualizar chave proibida
    const hasBlocked = keysToUpdate.some(k => BLOCKED_KEYS.includes(k.toUpperCase()));
    if (hasBlocked) {
      return NextResponse.json({ error: 'Tentativa de alterar configuração restrita do sistema bloqueada.' }, { status: 400 });
    }

    // Upsert para cada chave
    const promises = keysToUpdate.map(key => {
      const val = updates[key] !== null && updates[key] !== undefined ? String(updates[key]) : '';
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val }
      });
    });

    await Promise.all(promises);

    // Registra auditoria
    await prisma.activityLog.create({
      data: {
        userId: payload.id,
        action: 'config.update',
        entityType: 'system_config',
        details: JSON.stringify({ keysUpdated: keysToUpdate }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
