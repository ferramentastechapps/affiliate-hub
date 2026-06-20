import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');

    const response = NextResponse.json({ success: true, message: 'Deslogado com sucesso' });
    
    // Força a expiração do cookie definindo maxAge como 0
    response.cookies.set('session', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro ao realizar logout:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar logout' },
      { status: 500 }
    );
  }
}
