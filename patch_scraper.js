const fs = require('fs');
let code = fs.readFileSync('src/lib/scraper.ts', 'utf8');

// Strip out duckduckgo function completely
code = code.replace(/export async function searchDuckDuckGoImages[^]*?\n}\n/, '');

// Inside scrapeProductFromUrl, strip out duckduckgo fallback logic
code = code.replace(/if \(!imageUrl \|\| \(\!imageUrl\.startsWith\('http'\) && imageUrl !== '\/placeholder\.webp'\)\) \{[^]*?\}\n    \n    return/g, `if (!imageUrl || (!imageUrl.startsWith('http') && imageUrl !== '/placeholder.webp')) {
      imageUrl = '/placeholder.webp';
      console.warn('⚠️ Imagem original não encontrada. Retornando placeholder.');
    }
    
    return`);

code = code.replace(/if \(\!disableDdgFallback && \(slugName\.split\(' '\)\.length > 1 \|\| slugName\.length > 15\)\) \{[^]*?\} else \{[^]*?\}/, `// Fallback visual searches completely disabled
        console.warn('⚠️ Fallback de busca na web desativado, usando placeholder.');`);
        
fs.writeFileSync('src/lib/scraper.ts', code);
