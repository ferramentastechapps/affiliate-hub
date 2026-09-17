const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchDDG(query) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const vqdMatch = html.match(/vqd=([^&'"]+)/) || html.match(/vqd\s*=\s*['"]([^'"]+)['"]/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    const jsonUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
    const jsonRes = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
    });
    if (!jsonRes.ok) return [];
    const data = await jsonRes.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log("Iniciando verificação de produtos sem imagem...");
  const products = await prisma.product.findMany({
    where: {
      status: { in: ['active', 'approved', 'pending'] },
      OR: [
        { imageUrl: '/placeholder.webp' },
        { imageUrl: { contains: 'placeholder' } },
        { imageUrl: { contains: 'unavailable' } },
        { imageUrl: '' },
      ],
    },
    take: 50,
    select: { id: true, name: true, imageUrl: true, enhancedImageUrl: true },
  });

  console.log(`Encontrados ${products.length} produtos para curar imagem.`);

  let fixed = 0;
  for (const p of products) {
    console.log(`Processando: ${p.name.substring(0, 50)}...`);
    if (
      p.enhancedImageUrl &&
      p.enhancedImageUrl !== '/placeholder.webp' &&
      !p.enhancedImageUrl.includes('placeholder') &&
      !p.enhancedImageUrl.includes('unavailable')
    ) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: p.enhancedImageUrl },
      });
      console.log(`  -> Promovido enhancedImageUrl: ${p.enhancedImageUrl}`);
      fixed++;
      continue;
    }

    const clean = p.name.replace(/[\(\)\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const results = await searchDDG(clean);
    if (results && results.length > 0 && results[0].image) {
      const img = results[0].image;
      await prisma.product.update({
        where: { id: p.id },
        data: {
          imageUrl: img,
          enhancedImageUrl: results[1]?.image || null,
        },
      });
      console.log(`  -> Nova imagem obtida via DDG: ${img}`);
      fixed++;
    } else {
      console.log(`  -> Nenhuma imagem encontrada no DDG.`);
    }
  }

  console.log(`Cura concluída! Total corrigidos: ${fixed}`);
}

main().finally(() => prisma.$disconnect());
