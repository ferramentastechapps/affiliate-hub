import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'economizei-super-secret-jwt-key-2026-f6c684a41738ecbc';

async function verifyJwtSignature(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signature] = parts;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    let b64Signature = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (b64Signature.length % 4) b64Signature += '=';
    const signatureBytes = Uint8Array.from(atob(b64Signature), c => c.charCodeAt(0));
    
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);
    
    if (!isValid) return null;

    let b64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64Payload.length % 4) b64Payload += '=';
    const payloadStr = atob(b64Payload);
    const payload = JSON.parse(payloadStr);

    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // 1. Check JWT session auth
  const sessionCookie = request.cookies.get('session')?.value
  let isAuthenticatedAdmin = false;
  let payload = null;
  
  if (sessionCookie) {
    payload = await verifyJwtSignature(sessionCookie);
    if (payload && (payload.role === 'admin' || payload.role === 'moderator')) {
      isAuthenticatedAdmin = true;
    }
  }

  // 1. Protect admin pages: /admin/* (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAuthenticatedAdmin) {
      const loginUrl = new URL('/admin/login', request.url)
      if (sessionCookie && payload) {
        loginUrl.searchParams.set('error', 'access_denied')
      }
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2. Redirect authenticated admin away from login page
  if (pathname === '/admin/login') {
    if (isAuthenticatedAdmin) {
      const adminUrl = new URL('/admin', request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  // 3. Protect admin/modifying API routes:
  const isApiRoute = pathname.startsWith('/api/products') || 
                     pathname.startsWith('/api/coupons') || 
                     pathname.startsWith('/api/banners')
                     
  const isModifying = ['POST', 'PUT', 'DELETE'].includes(request.method)
  const isSensitiveGet = request.method === 'GET' && 
    (searchParams.get('status') === 'all' || searchParams.get('status') === 'pending')

  // Exceções para rotas públicas de interação de usuários
  const isPublicAction = pathname.match(/^\/api\/products\/[^\/]+\/(vote|alert|comments)$/)

  if (isApiRoute && (isModifying || isSensitiveGet) && !isPublicAction) {
    // Permite se tiver a sessão admin
    if (isAuthenticatedAdmin) {
      return NextResponse.next()
    }
    
    // Ou permite se tiver a API Key/Secret correspondente
    const apiKey = request.headers.get('x-api-key')
    const validKey = process.env.API_SECRET_KEY || process.env.AFFILIATE_HUB_API_KEY
    if (apiKey && validKey && apiKey === validKey) {
      return NextResponse.next()
    }

    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito ao administrador.' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*'
  ],
}
