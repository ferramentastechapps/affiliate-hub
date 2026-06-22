import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const urlConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_url' } });
    const tokenConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_token' } });

    if (!urlConfig?.value || !tokenConfig?.value) {
      return NextResponse.json({ success: false, error: 'URL ou Token não configurados.' });
    }

    // Faz um ping básico (depende da API de whatsapp usada, um POST pro endpoint sem destino ou msg vazia, ou um GET)
    // Para efeito de teste genérico, enviaremos um GET. Se falhar por método não suportado, também saberemos que o host existe.
    try {
      const res = await fetch(urlConfig.value, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenConfig.value}` }
      });
      // Aceita 200, 400 ou 405 (se a rota só aceitar POST, significa que pelo menos conectou)
      if (res.ok || res.status === 405 || res.status === 400) {
         return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: `Falha na requisição: Status ${res.status}` });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Falha de conexão com a URL' });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' });
  }
}
