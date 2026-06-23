import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { buildDynamicSystemPrompt } from '@/lib/ai';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const prompt = await buildDynamicSystemPrompt();
    return NextResponse.json({ prompt });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao gerar preview do prompt', details: error.message }, { status: 500 });
  }
}
