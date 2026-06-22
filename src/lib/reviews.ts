import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';

/**
 * Tenta ler o token do ML atualizado pelo bot Python
 */
function getMlAccessToken(): string | null {
  try {
    const tokenPath = path.join(process.cwd(), 'bot', 'ml_token.json');
    if (fs.existsSync(tokenPath)) {
      const content = fs.readFileSync(tokenPath, 'utf-8');
      const data = JSON.parse(content);
      return data.access_token || null;
    }
  } catch (error) {
    console.error('Erro ao ler token do ML:', error);
  }
  return process.env.ML_ACCESS_TOKEN || null;
}

/**
 * Busca e salva as reviews de um produto do Mercado Livre usando a API Oficial.
 * API Endpoint: https://api.mercadolibre.com/reviews/item/{itemId}
 */
export async function fetchAndSaveMLReviews(productId: string, mlUrl: string) {
  try {
    const match = mlUrl.match(/(MLB-?\d{8,15})/i);
    if (!match) {
      console.log(`[ML Reviews] Item ID não encontrado na URL: ${mlUrl}`);
      return;
    }
    
    const itemId = match[1].replace('-', '');
    const accessToken = getMlAccessToken();
    
    if (!accessToken) {
      console.log(`[ML Reviews] Token do ML não configurado. Pulando reviews para ${itemId}`);
      return;
    }

    console.log(`[ML Reviews] Buscando reviews para o item ${itemId}...`);

    const response = await fetch(`https://api.mercadolibre.com/reviews/item/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ML Reviews] Erro ao buscar reviews HTTP ${response.status}:`, errText);
      return;
    }

    const data = await response.json();
    
    // Atualizar os scores do produto
    if (data.rating_average !== undefined || data.paging?.total !== undefined) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          reviewScore: data.rating_average,
          reviewCount: data.paging?.total || 0
        }
      });
      console.log(`[ML Reviews] Produto atualizado: Média ${data.rating_average}, Total ${data.paging?.total}`);
    }

    // Salvar as reviews individuais no banco
    if (Array.isArray(data.reviews) && data.reviews.length > 0) {
      console.log(`[ML Reviews] Encontradas ${data.reviews.length} reviews.`);
      let saved = 0;
      for (const review of data.reviews) {
        if (!review.content) continue;

        try {
          await prisma.productReview.upsert({
            where: {
              productId_platform_externalId: {
                productId,
                platform: 'mercadolivre',
                externalId: String(review.id)
              }
            },
            create: {
              productId,
              platform: 'mercadolivre',
              externalId: String(review.id),
              authorName: 'Cliente Mercado Livre',
              rating: review.rate,
              comment: review.content,
              helpful: review.likes || 0,
              verified: true,
              publishedAt: review.date_created ? new Date(review.date_created) : new Date()
            },
            update: {
              rating: review.rate,
              comment: review.content,
              helpful: review.likes || 0
            }
          });
          saved++;
        } catch (dbError) {
          console.error(`[ML Reviews] Erro ao salvar review ${review.id}:`, dbError);
        }
      }
      console.log(`[ML Reviews] ${saved} reviews salvas/atualizadas para o produto.`);
    }

  } catch (error) {
    console.error(`[ML Reviews] Falha geral ao processar reviews:`, error);
  }
}
