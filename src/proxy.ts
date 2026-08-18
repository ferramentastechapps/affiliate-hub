import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.API_SECRET_KEY || 'economizei-super-secret-jwt-key-2026-f6c684a41738ecbc';
}

/**
 * Verifica a assinatura e expiração de um token JWT usando a Web Crypto API nativa (Edge runtime compatible).
 */
async function verifyJwtSignature(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const secret = getJwtSecret();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let b64Signature = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (b64Signature.length % 4) b64Signature += '=';
    const signatureBytes = Uint8Array.from(atob(b64Signature), (c) => c.charCodeAt(0));

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);

    if (!isValid) return null;

    let b64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64Payload.length % 4) b64Payload += '=';
    const payloadStr = atob(b64Payload);
    const payload = JSON.parse(payloadStr);

    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.delete('X-Powered-By');

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

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Checar sessão JWT via cookie
  const sessionCookie = request.cookies.get('session')?.value;
  let isAuthenticatedAdmin = false;
  let payload: Record<string, unknown> | null = null;

  if (sessionCookie) {
    payload = await verifyJwtSignature(sessionCookie);
    if (payload && (payload.role === 'admin' || payload.role === 'moderator')) {
      isAuthenticatedAdmin = true;
    }
  }

  // 2. Rota de Login do Admin (/admin/login)
  if (pathname === '/admin/login') {
    if (isAuthenticatedAdmin) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 3. Proteger páginas do Admin (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticatedAdmin) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      if (sessionCookie && !payload) {
        redirectRes.cookies.delete('session');
      }
      return applySecurityHeaders(redirectRes);
    }

    const role = payload?.role as string;
    if (role !== 'admin' && role !== 'moderator') {
      return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
    }
  }

  // 4. Proteger rotas da API Admin (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    if (isAuthenticatedAdmin) {
      return applySecurityHeaders(NextResponse.next());
    }

    const apiKey = request.headers.get('x-api-key');
    const validKey = process.env.API_SECRET_KEY || process.env.AFFILIATE_HUB_API_KEY;
    if (apiKey && validKey && apiKey === validKey) {
      return applySecurityHeaders(NextResponse.next());
    }

    if (sessionCookie && payload && payload.role !== 'admin' && payload.role !== 'moderator') {
      return applySecurityHeaders(NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }));
    }

    return applySecurityHeaders(
      NextResponse.json({ error: 'Não autorizado. Acesso restrito ao administrador.' }, { status: 401 })
    );
  }

  // 5. Proteger rotas de modificação da API pública/interna
  const isApiRoute =
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/coupons') ||
    pathname.startsWith('/api/banners') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/scrape');

  const isModifying = ['POST', 'PUT', 'DELETE'].includes(request.method);
  const isSensitiveGet =
    request.method === 'GET' &&
    (searchParams.get('status') === 'all' || searchParams.get('status') === 'pending');

  const isPublicAction = pathname.match(/^\/api\/products\/[^/]+\/(vote|alert|comments)$/);

  if (isApiRoute && (isModifying || isSensitiveGet) && !isPublicAction) {
    if (isAuthenticatedAdmin) {
      return applySecurityHeaders(NextResponse.next());
    }

    const apiKey = request.headers.get('x-api-key');
    const validKey = process.env.API_SECRET_KEY || process.env.AFFILIATE_HUB_API_KEY;
    if (apiKey && validKey && apiKey === validKey) {
      return applySecurityHeaders(NextResponse.next());
    }

    return applySecurityHeaders(
      NextResponse.json({ error: 'Não autorizado. Acesso restrito ao administrador.' }, { status: 401 })
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Aplica proxy em todas as rotas EXCETO arquivos estáticos e públicos
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/|icons/|manifest.json|enhanced/).*)',
  ],
};
