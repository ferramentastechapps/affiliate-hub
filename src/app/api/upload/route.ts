import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
