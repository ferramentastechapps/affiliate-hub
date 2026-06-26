import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { name, category, description, imageUrl, price, links, status, isFixed, brand, subcategory, platformProductId, productLinks, images, couponLink } = body;
    
    // Validação de campos obrigatórios
    if (!name || !category || !imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }
    
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Preparar upserts de links
    let productLinksOps = undefined;
    if (productLinks) {
      productLinksOps = {
        upsert: productLinks.map((link: any) => ({
          where: {
            productId_platform: {
              productId: id,
              platform: link.platform
            }
          },
          update: {
            sourceUrl: link.sourceUrl,
            affiliateUrl: link.affiliateUrl,
            generatedAffiliateUrl: link.generatedAffiliateUrl,
            isActive: link.isActive !== undefined ? link.isActive : true
          },
          create: {
            platform: link.platform,
            sourceUrl: link.sourceUrl,
            affiliateUrl: link.affiliateUrl,
            generatedAffiliateUrl: link.generatedAffiliateUrl,
            isActive: link.isActive !== undefined ? link.isActive : true
          }
        }))
      };
    }

    // Se platformProductId foi alterado, atualizar também platformId para manter consistência
    let platformIdUpdate = undefined;
    let platformTypeUpdate = undefined;
    if (platformProductId !== undefined) {
      platformIdUpdate = platformProductId;
      if (platformProductId) {
        if (existingProduct.platformType) {
          platformTypeUpdate = existingProduct.platformType;
        } else {
          const storeLower = (existingProduct.storeName || '').toLowerCase();
          if (storeLower.includes('amazon')) platformTypeUpdate = 'amazon';
          else if (storeLower.includes('mercado') || storeLower.includes('livre')) platformTypeUpdate = 'mercadolivre';
          else if (storeLower.includes('shopee')) platformTypeUpdate = 'shopee';
          else if (storeLower.includes('aliexpress')) platformTypeUpdate = 'aliexpress';
          else if (storeLower.includes('magalu') || storeLower.includes('magazine')) platformTypeUpdate = 'magalu';
          else if (storeLower.includes('kabum')) platformTypeUpdate = 'kabum';
          else if (storeLower.includes('netshoes')) platformTypeUpdate = 'netshoes';
        }
      } else {
        platformIdUpdate = null;
        platformTypeUpdate = null;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        category,
        brand,
        subcategory,
        platformProductId,
        platformId: platformIdUpdate,
        platformType: platformTypeUpdate,
        description,
        imageUrl,
        couponLink: couponLink !== undefined ? couponLink : undefined,
        price: price ? parseFloat(price) : null,
        status: status || undefined,
        isFixed: isFixed !== undefined ? isFixed : undefined,
        links: links ? {
          upsert: {
            create: links,
            update: links
          }
        } : undefined,
        productLinks: productLinksOps
      },
      include: {
        links: true,
        productLinks: true,
        images: true
      }
    });

    // Update ProductImages se fornecido
    if (images && Array.isArray(images)) {
      const imageIds = images.map((img: any) => img.id).filter(Boolean);
      // Deletar imagens que não estão no payload (se quiser manter as antigas não passadas no payload, remover isso)
      // Como a interface substituirá a galeria, vamos deletar as que não vieram
      await prisma.productImage.deleteMany({
        where: { productId: id, id: { notIn: imageIds } }
      });
      
      for (const [index, img] of images.entries()) {
        if (img.id) {
          await prisma.productImage.update({
            where: { id: img.id },
            data: { url: img.url, isPrimary: img.isPrimary || false, order: img.order ?? index }
          });
        } else {
          await prisma.productImage.create({
            data: {
              productId: id,
              url: img.url,
              isPrimary: img.isPrimary || false,
              order: img.order ?? index
            }
          });
        }
      }
    }
    
    // Tenta registrar o log de atividade se o status mudou
    if (status && status !== existingProduct.status) {
      try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;
        if (sessionToken) {
          const payload = verifyToken(sessionToken);
          if (payload && payload.userId) {
            await prisma.activityLog.create({
              data: {
                userId: payload.userId,
                action: status === 'active' ? 'product.approve' : (status === 'rejected' ? 'product.reject' : 'product.update_status'),
                entityType: 'product',
                entityId: id,
                details: JSON.stringify({ oldStatus: existingProduct.status, newStatus: status }),
              }
            });
          }
        }
      } catch (e) {
        console.error('Falha ao registrar ActivityLog:', e);
      }
    }
    
    console.log('✅ Produto atualizado:', product.id);
    return NextResponse.json(product);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    await prisma.product.delete({
      where: { id }
    });
    
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;
      if (sessionToken) {
        const payload = verifyToken(sessionToken);
        if (payload && payload.userId) {
          await prisma.activityLog.create({
            data: {
              userId: payload.userId,
              action: 'product.delete',
              entityType: 'product',
              entityId: id,
              details: JSON.stringify({ name: existingProduct.name }),
            }
          });
        }
      }
    } catch (e) {
      console.error('Falha ao registrar ActivityLog:', e);
    }
    
    console.log('✅ Produto deletado:', id);
    return NextResponse.json({ success: true, message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao deletar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
