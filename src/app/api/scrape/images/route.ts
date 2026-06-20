import { NextResponse } from 'next/server';
import { searchDuckDuckGoImages } from '@/lib/scraper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Parâmetro de busca "q" é obrigatório' }, 
        { status: 400 }
      );
    }
    
    console.log(`[Images-Search] Buscando imagens no DDG para: "${query}"`);
    const results = await searchDuckDuckGoImages(query);
    
    // Mapear apenas os campos que o frontend precisa
    const formattedResults = results.map(item => ({
      title: item.title,
      image: item.image,
      thumbnail: item.thumbnail,
      url: item.url
    })).filter(item => item.image); // Garantir que tem imagem
    
    console.log(`[Images-Search] Retornando ${formattedResults.length} imagens.`);
    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('❌ Erro no scrape de imagens:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar imagens' }, 
      { status: 500 }
    );
  }
}
