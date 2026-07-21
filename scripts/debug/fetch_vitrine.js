const fs = require('fs');

async function fetchVitrine() {
  const url = 'https://www.mercadolivre.com.br/social/promobit';
  console.log(`Fetching ${url}...`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  const html = await response.text();
  fs.writeFileSync('vitrine.html', html);
  
  const stateMatch = html.match(/_n\.ctx\.r\s*=\s*(\{[\s\S]+?\});/);
  if (stateMatch) {
    fs.writeFileSync('vitrine_state.json', stateMatch[1]);
    console.log('Saved vitrine_state.json');
  } else {
    console.log('No _n.ctx.r found');
  }
}

fetchVitrine().catch(console.error);
