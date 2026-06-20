import * as cheerio from 'cheerio';

async function run() {
  console.log('Buscando home do Promobit...');
  const res = await fetch('https://www.promobit.com.br/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const scriptText = $('#__NEXT_DATA__').text();
  if (!scriptText) {
    console.log('__NEXT_DATA__ não encontrado');
    return;
  }
  
  const data = JSON.parse(scriptText);
  const offers = data.props?.pageProps?.serverOffers?.offers || [];
  
  if (offers.length > 0) {
    const offer = offers[0];
    const offerUrl = `https://www.promobit.com.br/oferta/${offer.offerSlug}-${offer.offerId}`;
    console.log(`Oferta: ${offer.offerTitle}`);
    console.log(`URL Promobit: ${offerUrl}`);
    
    console.log('\nBuscando página da oferta...');
    const pageRes = await fetch(offerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);
    
    // 1. Procurar por links de redirecionamento ou "ir para a loja" no HTML
    console.log('\nProcurando links no HTML:');
    $page('a').each((i, el) => {
      const href = $page(el).attr('href') || '';
      if (href.includes('redirect') || href.includes('ir-para-loja') || href.includes('out/')) {
        console.log(`Link encontrado: ${href} | Texto: ${$page(el).text().trim()}`);
      }
    });
    
    // 2. Analisar o __NEXT_DATA__ da página do produto
    const pageScriptText = $page('#__NEXT_DATA__').text();
    if (pageScriptText) {
      console.log('\nAnalisando __NEXT_DATA__ do produto:');
      const pageData = JSON.parse(pageScriptText);
      const pageProps = pageData.props?.pageProps || {};
      console.log('Chaves de pageProps:', Object.keys(pageProps));
      
      const productOffer = pageProps.offer || pageProps.initialOffer || pageProps.serverOffer || pageProps.offerDetail || {};
      console.log('Chaves de productOffer:', Object.keys(productOffer));
      
      // Mostrar chaves que começam ou contêm "link" ou "url" ou "redirect"
      for (const k of Object.keys(productOffer)) {
        if (k.toLowerCase().includes('link') || k.toLowerCase().includes('url') || k.toLowerCase().includes('redirect') || k.toLowerCase().includes('dest')) {
          console.log(`  * ${k}: ${productOffer[k]}`);
        }
      }
    }
  } else {
    console.log('Nenhuma oferta encontrada na home.');
  }
}

run().catch(console.error);
