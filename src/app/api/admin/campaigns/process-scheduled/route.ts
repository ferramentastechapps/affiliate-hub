import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processCampaign } from '@/lib/campaigns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Busca campanhas agendadas cuja data já passou ou é o momento exato
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: new Date(),
        },
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nenhuma campanha agendada para este momento.' });
    }

    for (const campaign of campaigns) {
      // Passa para sending primeiro para não reprocessar
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'sending' }
      });
      
      // Processa a campanha assincronamente (Fire and Forget)
      processCampaign(campaign.id);
    }

    return NextResponse.json({ processed: campaigns.length, message: `${campaigns.length} campanha(s) enviada(s) para processamento.` });
  } catch (error) {
    console.error('Erro ao processar campanhas agendadas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
