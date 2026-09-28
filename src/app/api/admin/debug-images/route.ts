import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUsableImageUrl } from '@/lib/imageUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { id: true, imageUrl: true, enhancedImageUrl: true, store: true }
    });
    
    let blockedPrimary = 0;
    let blockedBoth = 0;
    let total = products.length;
    
    let blockedSamples: string[] = [];
    
    for (const p of products) {
      const u1 = isUsableImageUrl(p.imageUrl);
      const u2 = p.enhancedImageUrl ? isUsableImageUrl(p.enhancedImageUrl) : false;
      
      if (!u1) blockedPrimary++;
      if (!u1 && !u2) {
        blockedBoth++;
        if (blockedSamples.length < 10) {
          blockedSamples.push(`store:${p.store} img:${p.imageUrl} enh:${p.enhancedImageUrl}`);
        }
      }
    }
    
    return NextResponse.json({
      total,
      blockedPrimary,
      blockedBoth,
      blockedSamples
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
