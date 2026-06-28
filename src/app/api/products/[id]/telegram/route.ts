import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToModeration, publishToGroup } from '@/lib/telegram';
import { generateAffiliateLink, detectPlatform } from '@/lib/affiliate';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, affiliateLink, platform } = body;

    if (!action || !['moderate', 'publish'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "moderate" ou "publish".' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { links: true }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    if (action === 'moderate') {
      const success = await sendToModeration(product);
      if (success) {
        return NextResponse.json({ success: true, message: 'Produto enviado para moderação no Telegram com sucesso!' });
      } else {
        return NextResponse.json({ error: 'Erro ao enviar mensagem para o Telegram.' }, { status: 500 });
      }
    }

    // Caso action === 'publish'
    let finalAffiliateLink = affiliateLink;
    let finalPlatform = platform;

    // Se não forneceu o link de afiliado, tenta obter do banco ou gerar a partir do link original
    if (!finalAffiliateLink) {
      if (!product.links) {
        return NextResponse.json(
          { error: 'Nenhum link configurado para este produto. Por favor, insira o link de afiliado manualmente.' },
          { status: 400 }
        );
      }

      // Encontrar plataformas com links
      const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
      const allFilledLinks = platforms
        .filter(p => product.links?.[p])
        .map(p => ({ platform: p, url: product.links![p] as string }));

      if (allFilledLinks.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum link original preenchido no produto. Por favor, insira o link manualmente.' },
          { status: 400 }
        );
      }

      // Escolher a melhor entrada (primeira correspondência)
      const bestMatch = allFilledLinks[0];
      finalPlatform = finalPlatform || detectPlatform(bestMatch.url) || bestMatch.platform;
      
      console.log(`[Telegram-Publish] Gerando link de afiliado para ${finalPlatform} a partir de ${bestMatch.url}`);
      const generated = await generateAffiliateLink(bestMatch.url);
      
      if (!generated) {
        return NextResponse.json(
          { 
            error: `Não foi possível gerar o link de afiliado automaticamente para '${finalPlatform}'.`,
            details: `Configure o .env ou passe o link de afiliado manualmente.`
          },
          { status: 400 }
        );
      }
      finalAffiliateLink = generated;
    }

    if (!finalPlatform) {
      finalPlatform = detectPlatform(finalAffiliateLink) || 'amazon';
    }

    const lifestyleImage = product.enhancedImageUrl;
    if (!lifestyleImage || lifestyleImage.includes('placeholder') || lifestyleImage.trim() === '') {
      return NextResponse.json(
        { success: false, error: "Produto sem foto lifestyle. Adicione uma foto lifestyle antes de publicar no grupo." },
        { status: 400 }
      );
    }

    const success = await publishToGroup(product, finalPlatform, finalAffiliateLink);
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Produto publicado no grupo do Telegram com sucesso!',
        affiliateLink: finalAffiliateLink,
        platform: finalPlatform
      });
    } else {
      return NextResponse.json({ error: 'Erro ao publicar no grupo do Telegram.' }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro no endpoint Telegram de produtos:', error);
    return NextResponse.json(
      { 
        error: 'Erro no processamento da ação do Telegram',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
