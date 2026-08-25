import { NextResponse } from 'next/server';

/**
 * GET /api/proxy-image?url=...
 * Proxy seguro para carregar imagens externas no painel admin evitando bloqueios de CORS e Anti-Hotlink (403).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl || !imageUrl.startsWith('http')) {
      return new NextResponse('URL de imagem inválida', { status: 400 });
    }

    // Se for URL relativa local (ex: /uploads/... ou /enhanced/...), redireciona internamente
    if (imageUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(imageUrl, request.url));
    }

    let referer = '';
    try {
      const parsed = new URL(imageUrl);
      referer = `${parsed.protocol}//${parsed.hostname}/`;
    } catch {}

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return new NextResponse(`Falha ao obter imagem remota: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    console.error('[Proxy-Image] Erro ao carregar imagem remota:', error.message || error);
    return new NextResponse('Erro ao carregar imagem', { status: 502 });
  }
}
