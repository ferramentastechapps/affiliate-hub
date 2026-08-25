import { NextResponse } from 'next/server';
import { saveEnhancedImage } from '@/lib/storage';
import { validateApiKey } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

/**
 * POST /api/scrape/save-image
 * Baixa uma imagem de uma URL e a salva permanentemente em /public/enhanced/.
 */
export async function POST(request: Request) {
  // Aceitar tanto com api-key quanto sem (chamada local do bot ou sessão de admin)
  const forwarded = request.headers.get('x-forwarded-for');
  const isLocal = !forwarded || forwarded.startsWith('127.') || forwarded.startsWith('::1');

  let isAuthenticated = isLocal;

  if (!isAuthenticated) {
    const authOk = await validateApiKey(request);
    if (authOk) {
      isAuthenticated = true;
    } else {
      try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;
        const payload = sessionToken ? verifyToken(sessionToken) : null;
        if (payload && ['admin', 'moderator'].includes(payload.role)) {
          isAuthenticated = true;
        }
      } catch {}
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
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
