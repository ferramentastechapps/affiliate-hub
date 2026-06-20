import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyGoogleToken, signToken } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credencial do Google ausente' },
        { status: 400 }
      );
    }

    // Valida a credencial diretamente com as APIs de segurança do Google
    const googleProfile = await verifyGoogleToken(credential);

    if (!googleProfile) {
      return NextResponse.json(
        { error: 'Token do Google inválido ou expirado' },
        { status: 401 }
      );
    }

    const { googleId, email, name, picture } = googleProfile;
    const normalizedEmail = email.toLowerCase().trim();

    let user = null;

    // 1. Tenta buscar o usuário pelo googleId
    user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      // Atualiza o avatar e o nome se tiverem mudado no Google
      if (user.image !== picture || user.name !== name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image: picture, name },
        });
      }
    } else {
      // 2. Se não achou pelo googleId, tenta achar pelo email para vincular a conta
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUserByEmail) {
        // Vincula o Google ID à conta existente
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId,
            image: picture || existingUserByEmail.image,
          },
        });
      } else {
        // 3. Se não existe conta, cria um novo usuário automaticamente
        user = await prisma.user.create({
          data: {
            name,
            email: normalizedEmail,
            googleId,
            image: picture,
          },
        });
      }
    }

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
    console.error('Erro na autenticação Google OAuth:', error);
    return NextResponse.json(
      { error: 'Erro interno na autenticação com o Google' },
      { status: 500 }
    );
  }
}
