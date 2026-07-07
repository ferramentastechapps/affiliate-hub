import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Extrait campos permitidos
    const { category, brand, platformProductId, isFixed, imageUrl, updateSourceUrl, updateAffiliateUrl, platform, userRating } = body;

    const dataToUpdate: any = {};
    if (category !== undefined) dataToUpdate.category = category;
    if (brand !== undefined) dataToUpdate.brand = brand;
    if (platformProductId !== undefined) dataToUpdate.platformProductId = platformProductId;
    if (isFixed !== undefined) dataToUpdate.isFixed = isFixed;
    if (imageUrl !== undefined) {
      dataToUpdate.imageUrl = imageUrl;
      dataToUpdate.enhancedImageUrl = imageUrl;
    }
    if (userRating !== undefined) {
      dataToUpdate.userRating = userRating !== null ? parseInt(userRating) : null;
      dataToUpdate.ratedAt = userRating !== null ? new Date() : null;
    }

    if (Object.keys(dataToUpdate).length === 0 && updateSourceUrl === undefined && updateAffiliateUrl === undefined) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ 
      where: { id },
      include: { links: true, productLinks: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        category: true,
        brand: true,
        platformProductId: true,
        isFixed: true,
        imageUrl: true,
        updatedAt: true
      }
    });

    // Atualiza links se fornecidos
    if ((updateSourceUrl !== undefined || updateAffiliateUrl !== undefined)) {
      const targetPlatform = platform || existing.source || 'amazon'; // Fallback
      
      // Atualiza o novo schema ProductLink
      await prisma.productLink.upsert({
        where: { productId_platform: { productId: id, platform: targetPlatform } },
        create: {
          productId: id,
          platform: targetPlatform,
          sourceUrl: updateSourceUrl !== undefined ? updateSourceUrl : '',
          affiliateUrl: updateAffiliateUrl !== undefined ? updateAffiliateUrl : '',
          generatedAffiliateUrl: updateAffiliateUrl !== undefined ? updateAffiliateUrl : ''
        },
        update: {
          sourceUrl: updateSourceUrl !== undefined ? updateSourceUrl : undefined,
          affiliateUrl: updateAffiliateUrl !== undefined ? updateAffiliateUrl : undefined,
          generatedAffiliateUrl: updateAffiliateUrl !== undefined ? updateAffiliateUrl : undefined
        }
      });

      // Atualiza o schema antigo Link para compatibilidade
      if (['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'tiktok', 'magalu', 'kabum', 'netshoes'].includes(targetPlatform)) {
        const linkVal = updateAffiliateUrl || updateSourceUrl || '';
        await prisma.link.upsert({
          where: { productId: id },
          create: { productId: id, [targetPlatform]: linkVal },
          update: { [targetPlatform]: linkVal }
        });
      }
    }

    // Log de atividade
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (token) {
        const payload = verifyToken(token);
        if (payload?.userId) {
          await prisma.activityLog.create({
            data: {
              userId: payload.userId,
              action: 'product.inline_edit',
              entityType: 'product',
              entityId: id,
              details: JSON.stringify({ fieldsUpdated: Object.keys(dataToUpdate) }),
            }
          });
        }
      }
    } catch (_) { /* ignora */ }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('❌ Erro no PATCH /api/admin/products/[id]:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar produto', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
