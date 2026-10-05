const fs = require('fs');

const content = fs.readFileSync('src/lib/scraper.ts', 'utf8');
const lines = content.split('\n');

let targetCode = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes("if (!imageUrl || (!imageUrl.startsWith('http') && imageUrl !== '/placeholder.webp')) {")) {
    targetCode.push(lines[i]);
    targetCode.push("      imageUrl = '/placeholder.webp';");
    targetCode.push("      console.warn('⚠️ Imagem original não encontrada. Mantendo placeholder genérico.');");
    targetCode.push("    }");
    
    // skip until return {
    while (i < lines.length && !lines[i].includes("return {")) {
      i++;
    }
  } 
  else if (lines[i].includes("if (!disableDdgFallback && (slugName.split(' ').length > 1 || slugName.length > 15)) {")) {
    targetCode.push("        console.warn('⚠️ Fallbacks de imagens externos desabilitados. Mantendo placeholder.');");
    
    // skip until return {
    while (i < lines.length && !lines[i].includes("return {")) {
      i++;
    }
  }
  else if (lines[i].includes("export async function searchDuckDuckGoImages")) {
    // skip function
    while (i < lines.length && lines[i] !== "}") {
      i++;
    }
  }
  else {
    targetCode.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('src/lib/scraper.ts', targetCode.join('\n'));
