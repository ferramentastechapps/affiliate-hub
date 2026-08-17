import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Middleware global de segurança do Affiliate Hub.
 *
 * - Protege todas as rotas /admin/* e /api/admin/* exigindo sessão válida e role admin/moderator.
 * - Adiciona headers de segurança HTTP em todas as respostas.
 */

// Verifica o token JWT sem dependências externas (compatível com Edge Runtime)
function verifyJwtEdge(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    // Verificar expiração
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // ─── Headers de Segurança HTTP ─────────────────────────────────────────────
  // Previne clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Previne MIME sniffing attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Força HTTPS por 1 ano (HSTS)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Controla informações de referência
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Desabilita features desnecessárias do browser
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // XSS protection básica (para browsers antigos)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Remove header que revela tecnologia usada
  response.headers.delete('X-Powered-By');

  // CSP básica — permite recursos necessários do sistema
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://fcm.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // ─── Proteção de Rotas Admin ────────────────────────────────────────────────
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      }
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifica o JWT com o segredo do ambiente
    const secret = process.env.JWT_SECRET || process.env.API_SECRET_KEY || '';
    if (!secret) {
      console.error('[Middleware] JWT_SECRET não configurado!');
      if (isAdminApi) {
        return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 });
      }
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const payload = verifyJwtEdge(sessionToken, secret);

    if (!payload) {
      // Token inválido ou expirado
      if (isAdminApi) {
        return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
      }
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Limpa o cookie de sessão inválido
      redirectResponse.cookies.delete('session');
      return redirectResponse;
    }

    const role = payload.role as string;
    if (role !== 'admin' && role !== 'moderator') {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Arquivos públicos (imagens, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/|icons/|manifest.json).*)',
  ],
};
