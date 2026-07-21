function cleanTitle(title: string): string[] {
  const stopWords = new Set(['de', 'para', 'com', 'o', 'a', 'os', 'as', 'um', 'uma', 'em', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas']);
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s-]/g, '') // remove punctuation
    .split(/[\s-]+/)
    .filter(w => w.length > 1 && !stopWords.has(w));
}

function isTitleMatch(title1: string, title2: string): boolean {
  const words1 = cleanTitle(title1);
  const words2 = cleanTitle(title2);
  
  if (words1.length === 0 || words2.length === 0) return true; // fallback if empty
  
  const set2 = new Set(words2);
  let overlap = 0;
  for (const w of words1) {
    if (set2.has(w)) overlap++;
  }
  
  const score = overlap / Math.min(words1.length, words2.length);
  return score >= 0.5;
}

function isUrlTitleMatch(originalTitle: string, urlStr: string): boolean {
  try {
    // Replace hyphens and slashes with spaces to construct a title-like string from the URL
    const titleFromUrl = urlStr.replace(/[/-]/g, ' ');
    const match = isTitleMatch(originalTitle, titleFromUrl);
    console.log(`Matching original "${originalTitle}" with URL "${urlStr}" -> Result: ${match}`);
    return match;
  } catch {
    return true; // Fallback if URL parsing fails
  }
}

isUrlTitleMatch('Tênis Esportivo Masculino Fluir Olympikus', 'https://produto.mercadolivre.com.br/MLB-6992245086-tnis-vorax-1015-pro-masculino-academia-caminhada-original-_JM');
isUrlTitleMatch('Tênis Esportivo Masculino Fluir Olympikus', 'https://www.mercadolivre.com.br/tenis-esportivo-masculino-fluir-olympikus/p/MLB100371975037');
