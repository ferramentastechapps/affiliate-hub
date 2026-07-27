import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth-utils';

// Rate limiting: máximo de 5 tentativas falhas por IP a cada 15 minutos
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
}

const failedAttempts = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function checkRateLimit(ip: string): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry) return { blocked: false, retryAfterSec: 0 };

  const elapsed = now - entry.firstAttemptAt;

  // Janela expirou: limpar e liberar
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.delete(ip);
    return { blocked: false, retryAfterSec: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
    return { blocked: true, retryAfterSec };
  }

  return { blocked: false, retryAfterSec: 0 };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || Date.now() - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttemptAt: now });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Verifica rate limit antes de qualquer operação
    const { blocked, retryAfterSec } = checkRateLimit(ip);
    if (blocked) {
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

    const normalizedEmail = email.toLowerCase().trim();

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      recordFailedAttempt(ip);
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
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Login bem-sucedido: limpar tentativas falhas do IP
    clearFailedAttempts(ip);

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
