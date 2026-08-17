import { NextResponse } from 'next/server';
import { scrapeProductFromUrl } from '@/lib/scraper';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { isPrivateUrl, createRateLimiter, getClientIp } from '@/lib/rate-limit';

// Dominios permitidos para scraping (whitelist)
const ALLOWED_DOMAINS = [
  'amazon.com.br', 'amzn.to', 'amzn.com',
  'mercadolivre.com.br', 'mercadolibre.com',
  'shopee.com.br',
  'aliexpress.com',
  'magalu.com.br', 'magazinevoce.com.br',
  'kabum.com.br',
  'netshoes.com.br',
  'paguemenos.com.br',
  'americanas.com.br',
  'submarino.com.br',
  'casasbahia.com.br',
  'extra.com.br',
  'pontofrio.com.br',
  'tiktok.com', 'tiktokshop.com',
];

// Rate limit: 20 scrapes por minuto por IP
const scrapeRateLimiter = createRateLimiter('scrape', {
  windowMs: 60 * 1000,
  max: 20,
  message: 'Muitas requisições de scrape. Aguarde 1 minuto.',
});

export async function POST(request: Request) {
  try {
    // --- Autenticação: apenas admins e moderadores ---
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionPayload = sessionToken ? verifyToken(sessionToken) : null;
    if (!sessionPayload || !['admin', 'moderator'].includes(sessionPayload.role)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // --- Rate limiting ---
    const ip = getClientIp(request);
    const rl = scrapeRateLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.message },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL é obrigatória' }, 
        { status: 400 }
      );
    }
    
    // --- Valida URL ---
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL inválida. Forneça uma URL completa (ex: https://...)' },
        { status: 400 }
      );
    }

    // --- Proteção SSRF: bloqueia IPs internos e metadados de cloud ---
    if (isPrivateUrl(url)) {
      return NextResponse.json(
        { error: 'URL não permitida.' },
        { status: 403 }
      );
    }

    // --- Whitelist de domínios ---
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: `Domínio não suportado para scraping: ${hostname}` },
        { status: 403 }
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
