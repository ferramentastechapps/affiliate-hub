import fs from 'fs';

async function test() {
  const url = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BH14ZNh5MQo5hjlQuAkAYU5e9Cvdj%2F3%2FVoE%2FQ%2F5IYF6KWNvMzKSID3hJKAQmbqlw1d9XJBNpDMCCTgcjl%2Ba7Sa3Jp44is9Q7QR%2FdJjF4N38YV8N511gZ8L1M4e7hL3h1L2h5h1h3h2h3h%2Bh5h5h3h2h3h4h2h3h5h1h3h2h3h2h1h3h2h3h3h5h%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F';
  console.log('Fetching:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    }
  });
  
  const html = await response.text();
  fs.writeFileSync('ml_social_page.html', html);
  console.log('HTML saved to ml_social_page.html');
  
  // Tentar encontrar todos os JSON contendo preloaded state ou window.__PRELOADED_STATE__ ou similar
  const matches = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});/);
  if (matches) {
    console.log('Found window.__PRELOADED_STATE__!');
    fs.writeFileSync('ml_preloaded_state.json', matches[1]);
  } else {
    // Procurar por scripts JSON comuns
    console.log('window.__PRELOADED_STATE__ NOT found. Searching for JSON strings...');
    const stateMatches = html.match(/\{"state":\s*\{.+?\}\}/g);
    if (stateMatches) {
      console.log(`Found ${stateMatches.length} state-like JSON blocks`);
    }
  }
  
  // Imprimir os matches regex que a Strategy 2 tentou
  const idMatch = html.match(/"metadata"\s*:\s*\{[^}]*?"id"\s*:\s*"(MLB\d+)"/i);
  console.log('idMatch:', idMatch);

  const socialUrlMatch = html.match(/"url"\s*:\s*"(www\.mercadolivre\.com\.br\\[u002F]+[^"]+)"/i);
  console.log('socialUrlMatch:', socialUrlMatch);

  // Procurar por todos os MLB no html
  const mlbRegex = /(MLB-?\d{8,12})/g;
  const mlbMatches = html.match(mlbRegex);
  if (mlbMatches) {
    const uniqueMlbs = Array.from(new Set(mlbMatches));
    console.log('Unique MLB IDs found in HTML:', uniqueMlbs);
  }
}

test();
