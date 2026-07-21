const url = 'https://www.mercadolivre.com.br/social/pp20250311151339/lists';
fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(r => r.text())
  .then(html => {
    const match = html.match(/href="([^"]*produto\.mercadolivre\.com\.br\/MLB-[^"]+)"/i);
    console.log(match ? match[1] : 'fail');
  });
