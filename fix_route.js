const fs = require('fs');
let code = fs.readFileSync('src/app/api/webhook/products/route.ts', 'utf8');

const regex1 = /if \(isAggregatorImage\) \{\s+console\.log\(`\[Webhook AI\] 🔍 Buscando imagem alternativa de alta qualidade no Bing para: \$\{product\.name\}`\);\s+try \{\s+const ddgResults = await searchDuckDuckGoImages\(product\.name\);[\s\S]*?\} catch \(err\) \{\s+console\.error\(`\[Webhook AI\] ❌ Erro ao buscar substituta no DDG:`, err\);\s+\}\s+\}/m;

code = code.replace(regex1, `if (isAggregatorImage) {
            console.log(\`[Webhook AI] 🚫 Imagem do agregador mantida, sem fallback de busca externa.\`);
          }`);

const regex2 = /if \(product\.imageUrl && \(product\.imageUrl\.includes\('pechinchou\.com\.br'\) \|\| product\.imageUrl\.includes\('assets\.pechinchou\.com\.br'\)\)\) \{\s+console\.log\(`\[Webhook Batch AI\] 🚫 Imagem do Pechinchou bloqueada\. Tentando buscar substituta no Bing\.\.\.`\);\s+try \{\s+const ddgResults = await searchDuckDuckGoImages\(product\.name\);[\s\S]*?\} catch \(err\) \{\s+console\.error\(`\[Webhook Batch AI\] ❌ Erro ao buscar substituta no DDG:`, err\);\s+finalImageUrl = '';\s+\}\s+\}/m;

code = code.replace(regex2, `if (product.imageUrl && (product.imageUrl.includes('pechinchou.com.br') || product.imageUrl.includes('assets.pechinchou.com.br'))) {
                 console.log(\`[Webhook Batch AI] 🚫 Imagem do Pechinchou bloqueada. Sem fallback habilitado. Usando string vazia (placeholder).\`);
                 finalImageUrl = '';
               }`);

fs.writeFileSync('src/app/api/webhook/products/route.ts', code);
