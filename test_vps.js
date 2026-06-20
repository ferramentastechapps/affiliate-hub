const url = 'https://www.mercadolivre.com.br/social/pp20250311151339/lists';
fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(r => r.text())
  .then(html => {
    console.log("TAMANHO HTML:", html.length);
    const match = html.match(/href="([^"]*produto\.mercadolivre\.com\.br\/MLB-[^"]+)"/i);
    if(match) console.log("SUCESSO:", match[1]);
    else console.log("FALHA: Nao encontrou produto.");
  });
