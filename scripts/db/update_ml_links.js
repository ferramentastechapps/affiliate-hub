const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_TAG = '65225830';
const NEW_WORD = 'economizeicomjota';

function updateUrl(url) {
  if (!url || !url.toLowerCase().includes('mercadolivre')) return url;
  
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('matt_tool')) {
      parsed.searchParams.set('matt_tool', NEW_TAG);
    }
    if (parsed.searchParams.has('matt_word')) {
      parsed.searchParams.set('matt_word', NEW_WORD);
    }
    return parsed.toString();
  } catch (e) {
    let updated = url;
    updated = updated.replace(/matt_tool=[^&]+/g, `matt_tool=${NEW_TAG}`);
    updated = updated.replace(/matt_word=[^&]+/g, `matt_word=${NEW_WORD}`);
    return updated;
  }
}

async function main() {
  console.log("🔄 Iniciando atualização dos links do Mercado Livre no banco...");

  // 1. Atualizar modelo Link (legado)
  const legacyLinks = await prisma.link.findMany({
    where: {
      mercadoLivre: {
        contains: 'mercadolivre'
      }
    }
  });

  console.log(`📦 Encontrados ${legacyLinks.length} registros no modelo Link com URLs do Mercado Livre.`);
  let updatedLegacy = 0;

  for (const item of legacyLinks) {
    if (!item.mercadoLivre) continue;
    const newUrl = updateUrl(item.mercadoLivre);
    if (newUrl !== item.mercadoLivre) {
      await prisma.link.update({
        where: { id: item.id },
        data: { mercadoLivre: newUrl }
      });
      updatedLegacy++;
    }
  }
  console.log(`✅ ${updatedLegacy} links legados atualizados.`);

  // 2. Atualizar modelo ProductLink
  const productLinks = await prisma.productLink.findMany({
    where: {
      platform: 'mercadoLivre'
    }
  });

  console.log(`📦 Encontrados ${productLinks.length} registros no modelo ProductLink.`);
  let updatedProductLinks = 0;

  for (const pl of productLinks) {
    let changed = false;
    const updateData = {};

    if (pl.affiliateUrl) {
      const updatedAff = updateUrl(pl.affiliateUrl);
      if (updatedAff !== pl.affiliateUrl) {
        updateData.affiliateUrl = updatedAff;
        changed = true;
      }
    }

    if (pl.generatedAffiliateUrl) {
      const updatedGen = updateUrl(pl.generatedAffiliateUrl);
      if (updatedGen !== pl.generatedAffiliateUrl) {
        updateData.generatedAffiliateUrl = updatedGen;
        changed = true;
      }
    }

    if (changed) {
      await prisma.productLink.update({
        where: { id: pl.id },
        data: updateData
      });
      updatedProductLinks++;
    }
  }

  console.log(`✅ ${updatedProductLinks} links do modelo ProductLink atualizados com as novas tags!`);
  console.log("🎉 Migração de links concluída com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao atualizar links no banco:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
