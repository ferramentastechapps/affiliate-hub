import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('admin_session')
  const isAuthenticated = authCookie?.value === 'authenticated'

  const { pathname } = request.nextUrl

  // 1. Proteger rotas do painel admin (exceto a página de login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 2. Proteger rotas de mutação da API
  if (
    pathname.startsWith('/api/') && 
    !pathname.startsWith('/api/webhook/') && 
    !pathname.startsWith('/api/push/')
  ) {
    if (request.method !== 'GET') {
      if (!isAuthenticated) {
        return NextResponse.json({ error: 'Não autorizado. Acesso negado.' }, { status: 401 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*'
  ],
}
