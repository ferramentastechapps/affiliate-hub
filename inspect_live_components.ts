import fs from 'fs';

async function inspect() {
  const url = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BHf42Nh6MQo5bjIQuAkAYUSe9Cvdj%2F3cEVceQ0%2FSlYE6KWNvMzKSiD3hJKAQmbqIw1dX9jKBNpDMCCtGCjLbaZSa3Jp44is9QzQR%2Fd2jFsr3NO3mRHIED8Q7P1VcxLmIrEsPG6CiQYDyJoV7wfuJVke0oLtnbGeCP8IvcnfALMSIYRj4KgsATXO%2B3nAoq0CxMknwosixmOZLIraj';
  console.log('Fetching:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    }
  });
  
  const html = await response.text();
  const stateMatch = html.match(/_n\.ctx\.r\s*=\s*(\{[\s\S]+?\});/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const components = state?.appProps?.pageProps?.data?.components || [];
      console.log(`Found ${components.length} components:`);
      for (const c of components) {
        console.log(`- ID: ${c.id}, Type: ${c.type}`);
        if (c.id === 'card-featured') {
          console.log('card-featured polycards count:', c.recommendation_data?.polycards?.length);
        }
      }
    } catch (e: any) {
      console.error('Error parsing:', e.message);
    }
  } else {
    console.log('_n.ctx.r NOT found');
  }
}

inspect();
