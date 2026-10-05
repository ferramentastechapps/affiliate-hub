import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { scrapeProductFromUrl } from '@/lib/scraper';
import { prisma } from '@/lib/prisma';

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('amazon.com')) return 'amazon';
  if (u.includes('mercadolivre.com') || u.includes('mercadolibre.com')) return 'mercadolivre';
  if (u.includes('shopee.com')) return 'shopee';
  if (u.includes('aliexpress.com')) return 'aliexpress';
  if (u.includes('tiktok.com')) return 'tiktok';
  return 'generic';
}

export const dynamic = 'force-dynamic';

async function isAdmin(request: Request): Promise<boolean> {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.API_SECRET_KEY || process.env.AFFILIATE_HUB_API_KEY;
  if (apiKey && validKey && apiKey === validKey) return true;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const payload = token ? verifyToken(token) : null;
    if (payload && ['admin', 'moderator'].includes(payload.role)) return true;
  } catch {}

  return false;
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Campo "url" é obrigatório.' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
  }

  try {
    const scraped = await scrapeProductFromUrl(url);

    const platform = detectPlatform(url);
    const platformId = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const product = await prisma.product.create({
      data: {
        name: scraped.name,
        imageUrl: scraped.imageUrl,
        price: scraped.price ?? null,
        description: scraped.description ?? null,
        category: scraped.category ?? null,
        platformType: platform,
        platformId,
        status: 'active',
        isReel: true,
        isFixed: true,
        productLinks: {
          create: {
            platform,
            sourceUrl: url,
            affiliateUrl: url,
            isActive: true,
          },
        },
      },
      include: { productLinks: true },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Erro ao importar reel:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
