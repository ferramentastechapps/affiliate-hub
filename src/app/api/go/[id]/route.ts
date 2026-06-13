import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const channel = url.searchParams.get('ch') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || 'unknown';

    // 1. Buscar o produto e os links
    const product = await prisma.product.findUnique({
      where: { id },
      include: { links: true }
    });

    if (!product || !product.links) {
      return new NextResponse('Produto ou link não encontrado', { status: 404 });
    }

    // 2. Registrar o log do clique
    await prisma.clickLog.create({
      data: {
        productId: id,
        channel,
        userAgent: userAgent.substring(0, 255), // Limita tamanho por segurança
        referrer: referrer.substring(0, 255)
      }
    });

    // 3. Incrementar o contador de cliques geral
    await prisma.product.update({
      where: { id },
      data: { clicks: { increment: 1 } }
    });

    // 4. Decidir para qual plataforma redirecionar (pega a primeira disponível ou uma específica se quiser priorizar)
    const links = product.links as Record<string, string | null>;
    
    // Ordem de prioridade
    const platforms = ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'magalu', 'tiktok', 'netshoes', 'kabum'];
    
    let targetUrl: string | null = null;
    for (const p of platforms) {
      if (links[p]) {
        targetUrl = links[p];
        break;
      }
    }

    if (!targetUrl) {
      return new NextResponse('Nenhum link configurado para este produto', { status: 404 });
    }

    // 5. Redirecionar via HTTP (Server-side fast redirect)
    return NextResponse.redirect(targetUrl, 302);

  } catch (error) {
    console.error('Erro no rastreamento de link:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}
