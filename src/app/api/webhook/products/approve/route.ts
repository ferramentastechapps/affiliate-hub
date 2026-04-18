import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhook/products/approve
 * Aprova um produto pendente e atualiza o link de afiliado
 */
export async function POST(request: Request) {
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
    
    // Atualizar status do produto para active
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'active' }
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
