import fs from 'fs';

async function inspect() {
  const url = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BHf42Nh6MQo5bjIQuAkAYUSe9Cvdj%2F3cEVceQ0%2FSlYE6KWNvMzKSiD3hJKAQmbqIw1dX9jKBNpDMCCtGCjLbaZSa3Jp44is9QzQR%2Fd2jFsr3NO3mRHIED8Q7P1VcxLmIrEsPG6CiQYDyJoV7wfuJVke0oLtnbGeCP8IvcnfALMSIYRj4KgsATXO%2B3nAoq0CxMknwosixmOZLIraj';
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    }
  });
  
  const html = await response.text();
  const stateMatch = html.match(/_n\.ctx\.r\s*=\s*(\{[\s\S]+?\});/);
  if (stateMatch) {
    const state = JSON.parse(stateMatch[1]);
    const components = state?.appProps?.pageProps?.data?.components || [];
    const featuredComponent = components.find((c: any) => c.id === 'card-featured');
    if (featuredComponent) {
      console.log(JSON.stringify(featuredComponent, null, 2));
    } else {
      console.log('card-featured not found');
    }
  }
}

inspect();
