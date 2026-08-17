import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth-utils';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// Rate limit: 5 cadastros por IP a cada 15 minutos (anti account-farming)
const signupRateLimiter = createRateLimiter('signup', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitos cadastros deste IP. Tente novamente em 15 minutos.',
});

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

export async function POST(request: Request) {
  try {
    // --- Rate limiting ---
    const ip = getClientIp(request);
    const rl = signupRateLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.message },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { name: rawName, email: rawEmail, password } = body;

    // Validações básicas de formato
    if (!rawName || !rawEmail || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Valida e limita tamanho do nome
    const name = String(rawName).trim().slice(0, MAX_NAME_LENGTH);
    if (name.length < 2) {
      return NextResponse.json({ error: 'Nome muito curto.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Formato de e-mail inválido' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    // Normaliza o e-mail para letras minúsculas
    const normalizedEmail = rawEmail.toLowerCase().trim();

    // Verifica se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado' },
        { status: 400 }
      );
    }

    // Criptografa a senha de forma segura e nativa
    const hashedPassword = hashPassword(password);

    // Cria o usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    // Cria a sessão com JWT assinado
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
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
      },
    });
  } catch (error) {
    console.error('Erro no cadastro de cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar cadastro' },
      { status: 500 }
    );
  }
}
