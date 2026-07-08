import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Imagem não encontrada', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Detecta content type
    let contentType = 'image/jpeg';
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith('.png')) contentType = 'image/png';
    else if (lowerFilename.endsWith('.webp')) contentType = 'image/webp';
    else if (lowerFilename.endsWith('.gif')) contentType = 'image/gif';
    else if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) contentType = 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro na rota de fallback de uploads de imagens:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
