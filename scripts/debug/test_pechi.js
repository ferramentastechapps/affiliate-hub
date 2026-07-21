const url = 'https://pechinchou.com.br/oferta/caixa-de-som-partybox-aiwa-pb-06-bluetooth-20h-rgb-usb-tws';
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
  .then(res => res.text())
  .then(html => {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__".*?>(.*?)<\/script>/);
    if (nextDataMatch) {
      const data = JSON.parse(nextDataMatch[1]);
      const promo = data.props.pageProps.promo;
      console.log('long_url:', promo.long_url);
      console.log('short_url:', promo.short_url);
      console.log('url:', promo.url);
      console.log('offer_url:', promo.offer_url);
    } else {
      console.log('No NEXT_DATA');
    }
  });
