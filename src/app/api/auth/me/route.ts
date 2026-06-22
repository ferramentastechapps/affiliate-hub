import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-utils';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // Decodifica e valida o token JWT
    const payload = verifyToken(sessionToken);
    if (!payload || !payload.userId) {
      // Token corrompido ou expirado, limpa o cookie por conveniência
      const response = NextResponse.json({ user: null });
      response.cookies.delete('session');
      return response;
    }

    // Busca os dados do usuário no banco de dados para garantir que a conta ainda é válida
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete('session');
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erro ao verificar sessão do usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno na checagem de sessão' },
      { status: 500 }
    );
  }
}
