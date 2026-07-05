import { NextResponse } from 'next/server';
import { saveEnhancedImage } from '@/lib/storage';
import { validateApiKey } from '@/lib/auth';

/**
 * POST /api/scrape/save-image
 * Baixa uma imagem de uma URL e a salva permanentemente em /public/enhanced/.
 * Usado pelo bot do Telegram para persistir fotos lifestyle dos admins,
 * que de outra forma expirariam como URLs temporarias do Telegram.
 */
export async function POST(request: Request) {
  // Aceitar tanto com api-key quanto sem (chamada local do bot na mesma maquina)
  const forwarded = request.headers.get('x-forwarded-for');
  const isLocal = !forwarded || forwarded.startsWith('127.') || forwarded.startsWith('::1');

  if (!isLocal) {
    const authOk = await validateApiKey(request);
    if (!authOk) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url e obrigatorio' }, { status: 400 });
    }

    if (!url.startsWith('http')) {
      return NextResponse.json({ error: 'url deve comecar com http/https' }, { status: 400 });
    }

    console.log(`[save-image] Salvando imagem permanentemente: ${url.substring(0, 100)}`);

    const savedPath = await saveEnhancedImage(url, false);

    if (!savedPath) {
      return NextResponse.json(
        { error: 'Falha ao baixar ou salvar a imagem' },
        { status: 500 }
      );
    }

    console.log(`[save-image] Salvo em: ${savedPath}`);

    return NextResponse.json({
      success: true,
      path: savedPath,
      url: savedPath,
    });
  } catch (error) {
    console.error('[save-image] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar imagem', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
