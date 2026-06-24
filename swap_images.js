const fs = require('fs');
const path = require('path');

// Manually load environment variables from .env.local or .env
const loadEnv = () => {
  const possiblePaths = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env')
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        for (const line of envConfig.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            
            // Unquote
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            process.env[key] = value;
          }
        }
        console.log(`🔌 Carregado ambiente de: ${path.basename(envPath)}`);
        break;
      } catch (e) {
        console.warn(`Aviso ao ler ${envPath}:`, e.message);
      }
    }
  }
};

loadEnv();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Buscando produtos com ambos imageUrl e enhancedImageUrl preenchidos...");
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { enhancedImageUrl: { not: null } },
          { imageUrl: { not: null } }
        ]
      }
    });

    console.log(`📦 Encontrados ${products.length} produtos para análise.`);

    let count = 0;
    for (const p of products) {
      // Ignorar se alguma imagem for placeholder
      if (p.enhancedImageUrl.includes('placeholder') || p.imageUrl.includes('placeholder')) {
        continue;
      }
      
      // Já está no formato novo se enhancedImageUrl for uma rota local /enhanced/...
      // ou se imageUrl for do varejista (ex: amazon, mercadolivre) e enhancedImageUrl for do agregador (ex: promobit, pechinchou)
      const isAlreadyCorrect = p.imageUrl.includes('/enhanced/') || 
                                (!p.imageUrl.includes('promobit.com.br') && 
                                 !p.imageUrl.includes('pechinchou.com.br') && 
                                 (p.enhancedImageUrl.includes('promobit.com.br') || p.enhancedImageUrl.includes('pechinchou.com.br')));

      if (isAlreadyCorrect) {
        continue;
      }

      console.log(`🔄 Swapeando produto ${p.id}:\n  De (imageUrl: ${p.imageUrl}, enhanced: ${p.enhancedImageUrl})\n  Para (imageUrl: ${p.enhancedImageUrl}, enhanced: ${p.imageUrl})`);
      
      const oldImageUrl = p.imageUrl;
      const oldEnhancedImageUrl = p.enhancedImageUrl;

      await prisma.product.update({
        where: { id: p.id },
        data: {
          imageUrl: oldEnhancedImageUrl,
          enhancedImageUrl: oldImageUrl
        }
      });
      count++;
    }

    console.log(`✅ Concluído! Swapeados com sucesso ${count} produtos.`);
  } catch (err) {
    console.error("❌ Erro ao rodar script de swap:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
