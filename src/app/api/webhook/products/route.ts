import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey, validateWebhookSignature } from '@/lib/auth';
import { generateAffiliateLink } from '@/lib/affiliate';
import { processProductWithAI } from '@/lib/ai';
import { saveEnhancedImage } from '@/lib/storage';
import { getSecondaryLifestyleImage } from '@/lib/scraper';

async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  let hasAffiliate = false;
  let isAggregatorFailed = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const generated = await generateAffiliateLink(originalUrl);
        if (generated) {
          generatedLinks[platform] = generated;
          hasAffiliate = true;
        } else {
          const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
          if (isAggregator) {
            console.log(`[Webhook] Falha ao resolver link do agregador ${originalUrl}. Produto será descartado.`);
            isAggregatorFailed = true;
          } else {
            generatedLinks[platform] = originalUrl;
          }
        }
      } catch (e) {
        console.error(`Erro ao gerar link de afiliado para ${platform}:`, e);
        const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
        if (isAggregator) {
           isAggregatorFailed = true;
        } else {
           generatedLinks[platform] = originalUrl;
        }
      }
    }
  }

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    status: hasAffiliate ? 'active' : 'pending',
    isAggregatorFailed
  };
}

export async function POST(request: Request) {
  // Validar assinatura do Webhook
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.name || !body.category || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }

    // Tenta encontrar por externalId, senão procura por qualquer produto já ATIVO com o mesmo nome (sem limite de tempo)
    let existingProduct = await prisma.product.findFirst({
      where: body.externalId ? { externalId: body.externalId } : {
        name: body.name,
        status: { in: ['active', 'approved'] }
      },
      include: {
        links: true
      }
    });

    // Se não achou nenhum produto ativo anterior, procura por um PENDENTE criado nas últimas 24 horas
    if (!existingProduct && !body.externalId) {
      existingProduct = await prisma.product.findFirst({
        where: {
          name: body.name,
          status: 'pending',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas para pendentes
          }
        },
        include: {
          links: true
        }
      });
    }

    if (existingProduct) {
      // Registrar no histórico de preços
      if (body.price) {
        await prisma.priceHistory.create({
          data: {
            productId: existingProduct.id,
            price: parseFloat(body.price),
            originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
          }
        });
        
        // Verificar se podemos atualizar a imagem do produto existente
        // Apenas se a atual for do Promobit/Pechinchou ou placeholder/nula, e a nova for uma imagem de varejista real
        let imageUpdateData = {};
        const isOldImagePlaceholderOrAggregator = 
          !existingProduct.imageUrl || 
          existingProduct.imageUrl === '/placeholder.webp' || 
          existingProduct.imageUrl.includes('promobit.com.br') || 
          existingProduct.imageUrl.includes('pechinchou.com.br');
        
        const isNewImageBetter = 
          body.imageUrl && 
          body.imageUrl !== '/placeholder.webp' && 
          !body.imageUrl.includes('promobit.com.br') && 
          !body.imageUrl.includes('pechinchou.com.br');

        if (isOldImagePlaceholderOrAggregator && isNewImageBetter) {
          imageUpdateData = {
            imageUrl: body.imageUrl,
            enhancedImageUrl: body.imageUrl
          };
        }

        // Processar links novos para ver se temos novos links de afiliados
        const { links: processedLinks } = await processProductAffiliates(body);
        const linksUpdate: Record<string, string> = {};
        if (processedLinks) {
          const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
          for (const platform of platforms) {
            const newLink = processedLinks[platform];
            const oldLink = existingProduct.links?.[platform];
            if (newLink) {
              const isOldAggregator = !oldLink || oldLink.includes('promobit.com.br') || oldLink.includes('pechinchou.com.br');
              const isNewDirect = !newLink.includes('promobit.com.br') && !newLink.includes('pechinchou.com.br');
              if (isOldAggregator && isNewDirect) {
                linksUpdate[platform] = newLink;
              }
            }
          }
        }

        let linksData = undefined;
        if (Object.keys(linksUpdate).length > 0) {
          if (existingProduct.links) {
            linksData = { update: linksUpdate };
          } else {
            linksData = { create: linksUpdate };
          }
        }

        // Atualizar preço atual no produto e obter objeto atualizado
        const updatedProduct = await prisma.product.update({
          where: { id: existingProduct.id },
          data: { 
            price: parseFloat(body.price),
            originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : existingProduct.originalPrice,
            ...imageUpdateData,
            links: linksData
          },
          include: {
            links: true
          }
        });
        existingProduct = updatedProduct;
      }

      console.log('ℹ️ Produto duplicado detectado. Histórico de preço atualizado:', body.name);
      return NextResponse.json({
        success: true,
        message: 'Produto já cadastrado, preço atualizado no histórico.',
        product: {
          id: existingProduct.id,
          name: existingProduct.name,
          category: existingProduct.category,
          description: existingProduct.description,
          imageUrl: existingProduct.imageUrl,
          enhancedImageUrl: existingProduct.enhancedImageUrl,
          price: existingProduct.price,
          originalPrice: existingProduct.originalPrice,
          status: existingProduct.status,
          createdAt: existingProduct.createdAt,
          updatedAt: existingProduct.updatedAt,
          links: existingProduct.links
        }
      }, { status: 200 });
    }

    const { links: processedLinks, status: processedStatus, isAggregatorFailed } = await processProductAffiliates(body);
    
    if (isAggregatorFailed) {
      return NextResponse.json({
        success: false,
        error: 'Produto descartado: Link do agregador não pôde ser resolvido para um produto real (ex: vitrine ML bloqueada).'
      }, { status: 400 });
    }

    let finalStatus = body.status || processedStatus;

    if (body.autoApprove === true) {
      finalStatus = 'active';
      console.log(`[Webhook] Auto-aprovado por fonte confiável: ${body.name}`);
    } else if (!body.status) {
      // Começa como pending até a IA avaliar, a menos que o status tenha sido explicitamente passado
      finalStatus = 'pending';
    }

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        description: body.description || null,
        imageUrl: body.imageUrl,
        price: body.price ? parseFloat(body.price) : null,
        originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
        status: finalStatus,
        externalId: body.externalId || null,
        links: processedLinks ? {
          create: {
            amazon: processedLinks.amazon || null,
            mercadoLivre: processedLinks.mercadoLivre || null,
            shopee: processedLinks.shopee || null,
            aliexpress: processedLinks.aliexpress || null,
            tiktok: processedLinks.tiktok || null,
            netshoes: processedLinks.netshoes || null,
            magalu: processedLinks.magalu || null,
            kabum: processedLinks.kabum || null,
          }
        } : undefined
      },
      include: {
        links: true
      }
    });

    // Criar o primeiro registro de histórico de preço
    if (product.price) {
      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          price: product.price,
          originalPrice: product.originalPrice,
        }
      });
    }

    // Log para debug
    console.log('✅ Produto criado:', {
      id: product.id,
      name: product.name,
      hasId: !!product.id,
      allKeys: Object.keys(product)
    });

    const response = NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        enhancedImageUrl: product.enhancedImageUrl,
        price: product.price,
        originalPrice: product.originalPrice,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        links: product.links
      }
    }, { status: 201 });

    // Processar IA em background sem await
    processProductWithAI(
      body.name, 
      body.price ? parseFloat(body.price) : 0, 
      body.originalPrice ? parseFloat(body.originalPrice) : null,
      body.category
    ).then(async (aiResult) => {
      let newStatus = finalStatus;

      // Se a IA der nota boa, e não tinha status forçado, atualiza para o status dos links
      if (finalStatus === 'pending' && !body.status && aiResult.score && aiResult.score >= 8.0) {
        newStatus = processedStatus;
      }

      // Processamento da imagem se aprovado (obtendo imagem de lifestyle/secundária do varejista)
      let finalEnhancedImageUrl: string | null = null;
      if (newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
        const rawEnhancedUrl = await getSecondaryLifestyleImage(body.links || {});
        if (rawEnhancedUrl) {
          finalEnhancedImageUrl = await saveEnhancedImage(rawEnhancedUrl, false);
        }
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          aiScore: aiResult.score,
          aiAnalysis: aiResult.rawJson,
          enhancedImageUrl: finalEnhancedImageUrl,
          status: newStatus
        }
      });
      console.log(`🤖 IA finalizou processamento do produto ${product.id}`);
    }).catch(error => {
      console.error(`Erro no processamento de IA em background para ${product.id}:`, error);
    });

    return response;

  } catch (error) {
    console.error('Erro ao criar produto via webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}

// Endpoint para criar múltiplos produtos de uma vez
export async function PUT(request: Request) {
  // Validar assinatura do Webhook
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    if (!Array.isArray(body.products)) {
      return NextResponse.json(
        { error: 'Esperado um array de produtos' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const productData of body.products) {
      try {
        // Tenta encontrar por externalId, senão por nome recente
        const existingProduct = await prisma.product.findFirst({
          where: productData.externalId ? { externalId: productData.externalId } : {
            name: productData.name,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas
            }
          },
          include: {
            links: true
          }
        });

        if (existingProduct) {
          // Registrar no histórico de preços se houver preço
          if (productData.price) {
            await prisma.priceHistory.create({
              data: {
                productId: existingProduct.id,
                price: parseFloat(productData.price),
                originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
              }
            });
            // Verificar se podemos atualizar a imagem do produto existente
            // Apenas se a atual for do Promobit/Pechinchou ou placeholder/nula, e a nova for uma imagem de varejista real
            let imageUpdateData = {};
            const isOldImagePlaceholderOrAggregator = 
              !existingProduct.imageUrl || 
              existingProduct.imageUrl === '/placeholder.webp' || 
              existingProduct.imageUrl.includes('promobit.com.br') || 
              existingProduct.imageUrl.includes('pechinchou.com.br');
            
            const isNewImageBetter = 
              productData.imageUrl && 
              productData.imageUrl !== '/placeholder.webp' && 
              !productData.imageUrl.includes('promobit.com.br') && 
              !productData.imageUrl.includes('pechinchou.com.br');

            if (isOldImagePlaceholderOrAggregator && isNewImageBetter) {
              imageUpdateData = {
                imageUrl: productData.imageUrl,
                enhancedImageUrl: productData.imageUrl
              };
            }

            // Processar links novos para ver se temos novos links de afiliados
            const { links: processedLinks } = await processProductAffiliates(productData);
            const linksUpdate: Record<string, string> = {};
            if (processedLinks) {
              const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
              for (const platform of platforms) {
                const newLink = processedLinks[platform];
                const oldLink = existingProduct.links?.[platform];
                if (newLink) {
                  const isOldAggregator = !oldLink || oldLink.includes('promobit.com.br') || oldLink.includes('pechinchou.com.br');
                  const isNewDirect = !newLink.includes('promobit.com.br') && !newLink.includes('pechinchou.com.br');
                  if (isOldAggregator && isNewDirect) {
                    linksUpdate[platform] = newLink;
                  }
                }
              }
            }

            let linksData = undefined;
            if (Object.keys(linksUpdate).length > 0) {
              if (existingProduct.links) {
                linksData = { update: linksUpdate };
              } else {
                linksData = { create: linksUpdate };
              }
            }

            // Atualizar preço atual no produto
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: { 
                price: parseFloat(productData.price),
                originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : existingProduct.originalPrice,
                ...imageUpdateData,
                links: linksData
              }
            });
          }
          results.push(existingProduct);
          continue;
        }

        const { links: processedLinks, status: processedStatus, isAggregatorFailed } = await processProductAffiliates(productData);
        
        if (isAggregatorFailed) {
          errors.push({
            product: productData.name,
            error: 'Link do agregador não resolvível'
          });
          continue;
        }

        let finalStatus = productData.status || processedStatus;

        if (productData.autoApprove === true) {
          finalStatus = 'active';
          console.log(`[Webhook] Auto-aprovado por fonte confiável: ${productData.name}`);
        } else if (!productData.status) {
          finalStatus = 'pending';
        }

        const product = await prisma.product.create({
          data: {
            name: productData.name,
            category: productData.category,
            description: productData.description || null,
            imageUrl: productData.imageUrl,
            price: productData.price ? parseFloat(productData.price) : null,
            originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
            status: finalStatus,
            externalId: productData.externalId || null,
            links: processedLinks ? {
              create: {
                amazon: processedLinks.amazon || null,
                mercadoLivre: processedLinks.mercadoLivre || null,
                shopee: processedLinks.shopee || null,
                aliexpress: processedLinks.aliexpress || null,
                tiktok: processedLinks.tiktok || null,
                netshoes: processedLinks.netshoes || null,
                magalu: processedLinks.magalu || null,
                kabum: processedLinks.kabum || null,
              }
            } : undefined
          },
          include: {
            links: true
          }
        });

        // Criar o primeiro registro de histórico de preço
        if (product.price) {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price: product.price,
              originalPrice: product.originalPrice,
            }
          });
        }

        results.push(product);

        // Processar IA em background sem await
        processProductWithAI(
          productData.name, 
          productData.price ? parseFloat(productData.price) : 0, 
          productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          productData.category
        ).then(async (aiResult) => {
          let newStatus = finalStatus;

          if (finalStatus === 'pending' && !productData.status && aiResult.score && aiResult.score >= 8.0) {
            newStatus = processedStatus;
          }

          let finalEnhancedImageUrl: string | null = null;
          if (newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
            const rawEnhancedUrl = await getSecondaryLifestyleImage(productData.links || {});
            if (rawEnhancedUrl) {
              finalEnhancedImageUrl = await saveEnhancedImage(rawEnhancedUrl, false);
            }
          }

          await prisma.product.update({
            where: { id: product.id },
            data: {
              aiScore: aiResult.score,
              aiAnalysis: aiResult.rawJson,
              enhancedImageUrl: finalEnhancedImageUrl,
              status: newStatus
            }
          });
          console.log(`🤖 IA finalizou processamento do produto ${product.id}`);
        }).catch(error => {
          console.error(`Erro no processamento de IA em background para ${product.id}:`, error);
        });
      } catch {
        errors.push({
          product: productData.name,
          error: 'Erro ao criar produto'
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errorsCount: errors.length,
      results,
      errors
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar produtos em lote:', error);
    return NextResponse.json(
      { error: 'Erro ao processar produtos' },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar LINKS de um produto específico (Usado pelo Robô Telegram)
export async function PATCH(request: Request) {
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId, platform, link } = body;

    if (!productId || !platform || !link) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: productId, platform, link' },
        { status: 400 }
      );
    }

    // O Prisma espera a chave correta no update
    const validPlatforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Plataforma inválida. Use uma de: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Primeiro certificamos que o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { links: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Atualiza ou cria a entidade Link associada a este produto
    let updatedLinks;
    if (product.links) {
      updatedLinks = await prisma.link.update({
        where: { productId: productId },
        data: {
          [platform]: link
        }
      });
    } else {
      updatedLinks = await prisma.link.create({
        data: {
          productId: productId,
          [platform]: link
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Link da ${platform} atualizado com sucesso!`,
      links: updatedLinks
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao atualizar link de produto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar link do produto' },
      { status: 500 }
    );
  }
}

