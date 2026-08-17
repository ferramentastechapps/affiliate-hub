import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// Máximo 5 MB por upload
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Rate limit: 10 uploads por minuto por IP
const uploadRateLimiter = createRateLimiter('upload', {
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitos uploads. Aguarde 1 minuto.',
});

export async function POST(request: Request) {
  try {
    // --- Autenticação: apenas admins e moderadores ---
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const payload = sessionToken ? verifyToken(sessionToken) : null;
    if (!payload || !['admin', 'moderator'].includes(payload.role)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // --- Rate limiting por IP ---
    const ip = getClientIp(request);
    const rl = uploadRateLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.message },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    // --- Limite de tamanho ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo permitido: 5 MB.` },
        { status: 413 }
      );
    }

    // --- Valida tipo MIME declarado (defesa em camadas; Sharp faz validação real) ---
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Envie uma imagem.' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sharp valida o conteúdo real do arquivo (não confia no tipo declarado)
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `upload_${Date.now()}_${uniqueId}.webp`;
    const filePath = path.join(uploadsDir, fileName);

    // Converte qualquer formato de imagem para WebP utilizando compressão balanceada (80% quality)
    await sharp(buffer)
      .webp({ quality: 80 })
      .toFile(filePath);

    // Retorna a URL pública
    return NextResponse.json({ imageUrl: `/uploads/${fileName}` }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar e salvar a imagem.', details: error.message },
      { status: 500 }
    );
  }
}
