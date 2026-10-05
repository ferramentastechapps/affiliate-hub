const fs = require('fs');
let code = fs.readFileSync('src/lib/scraper.ts', 'utf8');

// 1. the primary find/replace for the first block:
code = code.replace(
  /if \(!imageUrl \|\| \(!imageUrl\.startsWith\('http'\) && imageUrl !== '\/placeholder\.webp'\)\) \{[\s\S]*?return \{/m,
  `if (!imageUrl || (!imageUrl.startsWith('http') && imageUrl !== '/placeholder.webp')) {
      imageUrl = '/placeholder.webp';
      console.warn('⚠️ Imagem original não encontrada. Mantendo placeholder.');
    }
    
    return {`
);

// 2. the secondary find/replace for the second block (slugName):
code = code.replace(
  /if \(!disableDdgFallback && \(slugName\.split\(' '\)\.length > 1[\s\S]*?\} else \{\s*console\.warn[^}]*\}\s*/m,
  `console.warn('⚠️ Busca de imagens externa desabilitada. Utilizando placeholder genérico ou providenciado.');\n        `
);

// 3. remove the import/export
code = code.replace(/export async function searchDuckDuckGoImages[\s\S]*?\}\n/m, '');
code = code.replace(/, searchDuckDuckGoImages/g, '');

fs.writeFileSync('src/lib/scraper.ts', code);
