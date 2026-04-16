import { NextResponse } from 'next/server';
import { scrapeProductFromUrl } from '@/lib/scraper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL é obrigatória' }, 
        { status: 400 }
      );
    }
    
    // Validar se é uma URL válida
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL inválida. Forneça uma URL completa (ex: https://...)' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Scraping URL:', url);
    
    const productData = await scrapeProductFromUrl(url);
    
    console.log('✅ Dados extraídos:', productData);
    
    return NextResponse.json(productData);
  } catch (error) {
    console.error('❌ Erro no scrape:', error);
    
    // Retornar mensagem de erro específica
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao buscar dados do produto';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Verifique se a URL está correta e acessível. Alguns sites podem bloquear scraping.'
      }, 
      { status: 500 }
    );
  }
}
