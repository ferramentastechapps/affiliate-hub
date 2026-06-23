import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processProductWithAI } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar a chave de API
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Aguardar params no Next 15+ (se aplicável, mas Next 14 é síncrono. Vou usar await params caso seja Promise)
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    // Buscar o produto
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verifica se já existe um título no aiAnalysis
    let currentAnalysis: any = {};
    if (product.aiAnalysis) {
      try {
        currentAnalysis = JSON.parse(product.aiAnalysis.toString());
        // Se já tiver titulo, não gera de novo (economiza tokens)
        if (currentAnalysis.titulo) {
          return NextResponse.json({
            success: true,
            caption: currentAnalysis.titulo,
            cached: true
          });
        }
      } catch (e) {
        console.warn(`[AI-Caption] Erro ao parsear aiAnalysis do produto ${id}:`, e);
      }
    }

    console.log(`[AI-Caption] Gerando legenda just-in-time para produto ${id} (${product.name})`);

    // Processar usando modo 'caption'
    const aiResult = await processProductWithAI(
      product.name,
      product.price ? parseFloat(product.price.toString()) : 0,
      product.originalPrice ? parseFloat(product.originalPrice.toString()) : null,
      product.category,
      product.id,
      'caption'
    );

    if (aiResult.titulo) {
      // Atualizar o aiAnalysis no banco mantendo o score original se existir
      const newAnalysis = {
        ...currentAnalysis,
        titulo: aiResult.titulo,
        ...(aiResult.subtitulo ? { subtitulo: aiResult.subtitulo } : {}),
      };

      await prisma.product.update({
        where: { id },
        data: {
          aiAnalysis: JSON.stringify(newAnalysis)
        }
      });

      return NextResponse.json({
        success: true,
        caption: aiResult.titulo,
        cached: false
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Não foi possível gerar a legenda'
    }, { status: 500 });

  } catch (error: any) {
    console.error(`[AI-Caption] Erro na geração de legenda para o produto:`, error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao gerar legenda',
      details: error.message
    }, { status: 500 });
  }
}
