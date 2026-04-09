import { NextResponse } from 'next/server';
import { scrapeProductFromUrl } from '@/lib/scraper';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }
    
    console.log('Scraping URL:', url);
    
    const productData = await scrapeProductFromUrl(url);
    
    console.log('Product data scraped:', productData);
    
    return NextResponse.json(productData);
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar dados do produto' }, 
      { status: 500 }
    );
  }
}
