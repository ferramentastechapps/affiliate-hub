import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

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
    
    if (!platform || !affiliateLink) {
      return NextResponse.json(
        { error: 'platform e affiliateLink são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (!affiliateLink.startsWith('http')) {
      return NextResponse.json(
        { error: 'affiliateLink deve ser uma URL válida' },
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
          [platform]: affiliateLink
        }
      });
    } else {
      // Criar novo link
      await prisma.link.create({
        data: {
          productId: productId,
          [platform]: affiliateLink
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
              platform: platformNames[platform] || platform,
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
    
    console.log(`✅ Produto aprovado: ${productId} | Plataforma: ${platform}`);
    
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
      platform,
      product: {
        name: product.name,
        price: product.price,
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
