import fs from 'fs';

async function run() {
  const url = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BH14ZNh5MQo5hjlQuAkAYU5e9Cvdj%2F3%2FVoE%2FQ%2F5IYF6KWNvMzKSID3hJKAQmbqlw1d9XJBNpDMCCTgcjl%2Ba7Sa3Jp44is9Q7QR%2FdJjF4N38YV8N511gZ8L1M4e7hL3h1L2h5h1h3h2h3h%2Bh5h5h3h2h3h4h2h3h5h1h3h2h3h2h1h3h2h3h3h5h%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F';
  
  for (let i = 0; i < 5; i++) {
    console.log(`Fetch attempt ${i + 1}...`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        }
      });
      const html = await response.text();
      const oIdx = html.toLowerCase().indexOf('olympikus');
      if (oIdx !== -1) {
        console.log(`SUCCESS! Found Olympikus at index ${oIdx}`);
        fs.writeFileSync('ml_social_olympikus.html', html);
        
        // Print 4000 characters around "olympikus"
        const start = Math.max(0, oIdx - 2000);
        const end = Math.min(html.length, oIdx + 2000);
        console.log(html.substring(start, end));
        return;
      } else {
        console.log(`Olympikus not found. HTML length: ${html.length}`);
      }
    } catch (err) {
      console.error('Error on fetch:', err);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
