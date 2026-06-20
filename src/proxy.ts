import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const adminSession = request.cookies.get('admin_session')?.value
  const isAuthenticated = adminSession === 'authenticated'
  
  // 1. Protect admin pages: /admin/* (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2. Redirect authenticated admin away from login page
  if (pathname === '/admin/login') {
    if (isAuthenticated) {
      const adminUrl = new URL('/admin', request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  // 3. Protect admin/modifying API routes:
  // - Any POST, PUT, DELETE on /api/products, /api/coupons, /api/banners (and their subroutes/ids)
  // - Any GET on those with status=all or status=pending
  const isApiRoute = pathname.startsWith('/api/products') || 
                     pathname.startsWith('/api/coupons') || 
                     pathname.startsWith('/api/banners')
                     
  const isModifying = ['POST', 'PUT', 'DELETE'].includes(request.method)
  const isSensitiveGet = request.method === 'GET' && 
    (searchParams.get('status') === 'all' || searchParams.get('status') === 'pending')

  if (isApiRoute && (isModifying || isSensitiveGet)) {
    // Permite se tiver a sessão admin
    if (isAuthenticated) {
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
