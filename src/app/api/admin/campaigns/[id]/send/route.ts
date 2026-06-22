import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { processCampaign } from '@/lib/campaigns';

// Fire-and-forget implementation no Next.js App Router:
// O endpoint retorna uma resposta HTTP imediatamente e continua a execução assíncrona.
// Em ambientes serverless (Vercel) isso pode ser interrompido dependendo do limite de tempo de execução,
// mas em VPS + PM2 a promessa continua executando sem travar a resposta.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json({ error: 'Apenas campanhas em rascunho ou agendadas podem ser enviadas' }, { status: 400 });
    }

    // Para evitar 400 no Whatsapp sem config, validamos antes do envio
    if (campaign.channel === 'whatsapp') {
      const urlConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_url' } });
      const tokenConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_token' } });
      if (!urlConfig?.value || !tokenConfig?.value) {
        await prisma.campaign.update({ where: { id }, data: { status: 'failed' }});
        return NextResponse.json({ error: 'Configure a integração WhatsApp em Configurações do Sistema antes de enviar.' }, { status: 400 });
      }
    }

    // Atualiza status para sending imediatamente (resposta rápida ao cliente)
    await prisma.campaign.update({
      where: { id },
      data: { status: 'sending' }
    });

    // Registra a ação
    await prisma.activityLog.create({
      data: {
        userId: payload.id,
        action: 'campaign.send',
        entityType: 'campaign',
        entityId: campaign.id,
        details: JSON.stringify({ title: campaign.title, channel: campaign.channel }),
      },
    });

    // Inicia o processamento assíncrono (Fire and Forget)
    processCampaign(id);

    return NextResponse.json({ success: true, message: 'Envio iniciado em background' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
