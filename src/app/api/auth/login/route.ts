import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth-utils';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// Rate limiting: máximo de 10 tentativas por IP a cada 15 minutos
const loginRateLimiter = createRateLimiter('login', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Tente novamente em 15 minuto(s).',
});


export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Verifica rate limit antes de qualquer operação
    const rl = loginRateLimiter(ip);
    if (!rl.success) {
      const retryAfterSec = Math.ceil(rl.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Muitas tentativas falhas. Tente novamente em ${Math.ceil(retryAfterSec / 60)} minuto(s).` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Se o usuário foi criado por login social (Google) e não possui senha cadastrada
    if (!user.password) {
      return NextResponse.json(
        { error: 'Esta conta foi criada com o Google. Por favor, entre usando o Google.' },
        { status: 400 }
      );
    }

    // Verifica a senha de forma nativa e segura
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Login bem-sucedido: o rate limit se reseta naturalmente na próxima janela

    // Cria a sessão com JWT assinado
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Configura o cookie de sessão HTTP-Only
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 dias
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erro no login de cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar login' },
      { status: 500 }
    );
  }
}
