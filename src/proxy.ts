import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Ignorar rota de login e rotas não-admin
  if (request.nextUrl.pathname.startsWith('/admin/login') || !request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Verificar cookie
  const session = request.cookies.get('admin_session')
  
  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
