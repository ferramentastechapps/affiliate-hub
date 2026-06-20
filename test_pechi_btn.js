const url = 'https://pechinchou.com.br/oferta/caixa-de-som-partybox-aiwa-pb-06-bluetooth-20h-rgb-usb-tws';
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
  .then(res => res.text())
  .then(html => {
    const fs = require('fs');
    fs.writeFileSync('pechi_page.html', html);
    const linkMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>.*?(Ir|Comprar|Mercado Livre).*?<\/a>/is);
    console.log('Button link:', linkMatch ? linkMatch[1] : 'Not found');
  });
