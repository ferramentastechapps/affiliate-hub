const fs = require('fs');

// src/app/api/admin/products/fix-images/route.ts
let code1 = fs.readFileSync('src/app/api/admin/products/fix-images/route.ts', 'utf8');
code1 = code1.replace(/import \{ searchBingImages \} from '@\/lib\/scraper';\n/, '');
code1 = code1.replace(/const ddgResults = await searchBingImages\(cleanName\);[\s\S]*?\}\n/m, 
`// Busca externa foi revogada, mantendo placeholder
`);
fs.writeFileSync('src/app/api/admin/products/fix-images/route.ts', code1);

// src/app/api/scrape/images/route.ts
let code2 = fs.readFileSync('src/app/api/scrape/images/route.ts', 'utf8');
code2 = code2.replace(/import \{ searchBingImages \} from '@\/lib\/scraper';\n/, '');
code2 = code2.replace(/const results = await searchBingImages\(query\);/g, 'const results: any[] = []; // Busca revogada');
fs.writeFileSync('src/app/api/scrape/images/route.ts', code2);
