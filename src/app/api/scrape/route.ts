import { NextResponse } from 'next/server';
import { scrapeProductFromUrl } from '@/lib/scraper';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }
    
    const productData = await scrapeProductFromUrl(url);
    
    return NextResponse.json(productData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar dados do produto' }, 
      { status: 500 }
    );
  }
}
