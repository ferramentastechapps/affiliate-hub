import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';
import { generateAffiliateLink, detectPlatform } from '@/lib/affiliate';

/**
 * POST /api/webhook/products/approve
 * Aprova um produto pendente e atualiza o link de afiliado
 */
export async function POST(request: Request) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. API key inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId, platform, affiliateLink } = body;
    
    // Validação
    if (!productId) {
      return NextResponse.json(
        { error: 'productId é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { links: true }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    let targetPlatform = platform;
    let finalAffiliateLink = affiliateLink;

    // Se o link de afiliado não foi fornecido, tenta gerar automaticamente
    if (!finalAffiliateLink) {
      if (!product.links) {
        return NextResponse.json(
          { error: 'Nenhum link original encontrado no banco de dados para este produto. Por favor, envie o link manualmente.' },
          { status: 400 }
        );
      }

      // Encontrar qual plataforma tem o link original preenchido
      // IMPORTANTE: Primeiro tentar detectar a plataforma pelo conteúdo da URL (mais confiável)
      // O scraper às vezes salva o link do Pechinchou na coluna errada (ex: amazon em vez de mercadoLivre)
      const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
      
      // Coletar todos os links preenchidos
      const allFilledLinks = platforms
        .filter(p => product.links?.[p])
        .map(p => ({ platform: p, url: product.links![p] as string }));

      if (allFilledLinks.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum link original preenchido no produto para servir de base. Por favor, envie o link manualmente.' },
          { status: 400 }
        );
      }

      // Tentar detectar a plataforma real pelo conteúdo da URL (ignora a coluna onde foi salvo)
      let bestMatch = allFilledLinks[0]; // fallback para o primeiro
      for (const entry of allFilledLinks) {
        const detectedPlatform = detectPlatform(entry.url);
        if (detectedPlatform && detectedPlatform !== 'amazon') {
          // Se detectou uma plataforma específica (não amazon default), usa ela
          bestMatch = { platform: detectedPlatform as typeof platforms[number], url: entry.url };
          break;
        }
        if (detectedPlatform === 'amazon' && entry.url.toLowerCase().includes('amazon')) {
          // Só usa amazon se o link realmente for da Amazon
          bestMatch = entry;
          break;
        }
      }

      // Se todos os links são de plataformas intermediárias (pechinchou, promobit, etc),
      // resolve via generateAffiliateLink que já sabe lidar com isso
      targetPlatform = bestMatch.platform;
      const originalScrapedUrl = bestMatch.url;

      console.log(`[Approve] Detectando plataforma de: ${originalScrapedUrl}`);
      const detectedFromUrl = detectPlatform(originalScrapedUrl);
      if (detectedFromUrl) {
        targetPlatform = detectedFromUrl as typeof platforms[number];
        console.log(`[Approve] Plataforma real detectada pela URL: ${targetPlatform}`);
      } else {
        // Fallback: tentar inferir plataforma pela descrição do produto
        // (o scraper geralmente escreve "Oferta na loja Mercado Livre no Pechinchou")
        const desc = (product.description || '').toLowerCase();
        if (desc.includes('mercado livre') || desc.includes('mercadolivre')) {
          targetPlatform = 'mercadoLivre';
        } else if (desc.includes('shopee')) {
          targetPlatform = 'shopee';
        } else if (desc.includes('amazon')) {
          targetPlatform = 'amazon';
        } else if (desc.includes('aliexpress')) {
          targetPlatform = 'aliexpress';
        } else if (desc.includes('magalu') || desc.includes('magazine')) {
          targetPlatform = 'magalu';
        } else if (desc.includes('kabum')) {
          targetPlatform = 'kabum';
        } else if (desc.includes('netshoes')) {
          targetPlatform = 'netshoes';
        }
        if (targetPlatform !== bestMatch.platform) {
          console.log(`[Approve] Plataforma detectada pela descrição do produto: ${targetPlatform}`);
        }
      }

      console.log(`[Approve] Gerando link de afiliado para ${targetPlatform} a partir de: ${originalScrapedUrl}`);
      const generated = await generateAffiliateLink(originalScrapedUrl);

      if (!generated) {
        return NextResponse.json(
          { 
            error: `Não foi possível gerar o link de afiliado automaticamente para '${targetPlatform}'.`,
            details: `Certifique-se de configurar a variável ${targetPlatform.toUpperCase()}_TEMPLATE ou a respectiva Tag/Shop no arquivo .env.`
          },
          { status: 400 }
        );
      }

      finalAffiliateLink = generated;
      // Re-detectar plataforma pelo link gerado (mais preciso)
      const detectedFromGenerated = detectPlatform(finalAffiliateLink);
      if (detectedFromGenerated) {
        targetPlatform = detectedFromGenerated as typeof platforms[number];
      }
    }

    // Garantir que temos plataforma e link válidos neste momento
    if (!targetPlatform) {
      targetPlatform = detectPlatform(finalAffiliateLink) || 'amazon';
    }

    if (!finalAffiliateLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'O link de afiliado deve ser uma URL válida (começando com http/https)' },
        { status: 400 }
      );
    }
    
    // Atualizar status do produto para active + imageUrl se fornecida
    const updateData: { status: string; imageUrl?: string } = { status: 'active' };
    if (body.imageUrl) {
      updateData.imageUrl = body.imageUrl;
    }
    
    await prisma.product.update({
      where: { id: productId },
      data: updateData
    });
    
    // Atualizar ou criar o link de afiliado
    if (product.links) {
      // Atualizar link existente
      await prisma.link.update({
        where: { id: product.links.id },
        data: {
          [targetPlatform]: finalAffiliateLink
        }
      });
    } else {
      // Criar novo link
      await prisma.link.create({
        data: {
          productId: productId,
          [targetPlatform]: finalAffiliateLink
        }
      });
    }
    
    // Extrair cupom da descrição do produto (se existir)
    let couponData = null;
    if (product.description && product.description.includes('🎟️ CUPOM:')) {
      const couponMatch = product.description.match(/🎟️ CUPOM:\s*([^\n]+)/);
      if (couponMatch) {
        const couponCode = couponMatch[1].trim();
        
        // Verificar se o cupom já existe para este produto
        const existingCoupon = await prisma.coupon.findFirst({
          where: {
            code: couponCode,
            productId: productId
          }
        });
        
        if (!existingCoupon) {
          // Criar cupom no banco de dados
          const platformNames: Record<string, string> = {
            'amazon': 'Amazon',
            'mercadoLivre': 'Mercado Livre',
            'shopee': 'Shopee',
            'aliexpress': 'AliExpress',
            'tiktok': 'TikTok Shop'
          };
          
          couponData = await prisma.coupon.create({
            data: {
              code: couponCode,
              description: `Cupom de desconto para ${product.name}`,
              discount: 'Desconto aplicado',
              platform: platformNames[targetPlatform] || targetPlatform,
              productId: productId,
              isActive: true
            }
          });
          
          console.log(`✅ Cupom criado: ${couponCode} para produto ${productId}`);
        } else {
          couponData = existingCoupon;
          console.log(`ℹ️ Cupom já existe: ${couponCode}`);
        }
      }
    }
    
    console.log(`✅ Produto aprovado: ${productId} | Plataforma: ${targetPlatform}`);
    
    // Enviar notificação push para todos os inscritos
    try {
      const pushPayload = {
        title: '🔥 Nova promoção disponível!',
        body: `${product.name} por R$ ${product.price?.toFixed(2) || '0.00'}`,
        icon: product.imageUrl || '/icons/icon-192x192.png',
        url: `/?product=${productId}`,
        productId: productId,
      };

      // Adiciona desconto se houver preço original
      if (product.originalPrice && product.price) {
        const discount = ((product.originalPrice - product.price) / product.originalPrice) * 100;
        pushPayload.body += ` (${discount.toFixed(0)}% OFF)`;
      }

      // Envia notificação (não aguarda resposta para não bloquear)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_SECRET_KEY || '',
        },
        body: JSON.stringify(pushPayload),
      }).catch(err => console.error('Erro ao enviar push notification:', err));
      
      console.log('📱 Notificação push enviada');
    } catch (pushError) {
      console.error('❌ Erro ao enviar notificação push:', pushError);
      // Não falha a aprovação se a notificação falhar
    }
    
    return NextResponse.json({
      success: true,
      message: 'Produto aprovado e link atualizado',
      productId,
      platform: targetPlatform,
      affiliateLink: finalAffiliateLink,
      product: {
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl,
        category: product.category,
        description: product.description,
      },
      coupon: couponData ? {
        id: couponData.id,
        code: couponData.code,
        description: couponData.description,
        discount: couponData.discount,
        platform: couponData.platform
      } : null
    });
    
  } catch (error) {
    console.error('❌ Erro ao aprovar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao aprovar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
