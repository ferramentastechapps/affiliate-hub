import fs from 'fs';

async function run() {
  const url = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BHf42Nh6MQo5bjIQuAkAYUSe9Cvdj%2F3cEVceQ0%2FSlYE6KWNvMzKSiD3hJKAQmbqIw1dX9jKBNpDMCCtGCjLbaZSa3Jp44is9QzQR%2Fd2jFsr3NO3mRHIED8Q7P1VcxLmIrEsPG6CiQYDyJoV7wfuJVke0oLtnbGeCP8IvcnfALMSIYRj4KgsATXO%2B3nAoq0CxMknwosixmOZLIraj';
  console.log('Fetching live URL with valid ref...');
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  fs.writeFileSync('live_social.html', html);
  
  // Let's find any big script blocks containing JSON data
  // Often ML puts page data in a script tag like:
  // <script>window.__PRELOADED_STATE__ = ...</script> or inside a specific element
  console.log('Searching for script blocks...');
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes('highlighted') || content.includes('vitrine-featured') || content.includes('polycards')) {
      console.log(`Script ${++count} contains matching keyword! Length: ${content.length}`);
      fs.writeFileSync(`script_block_${count}.txt`, content);
      
      // Let's try to extract JSON from the script content
      // E.g. finding window.__PRELOADED_STATE__ or similar
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          fs.writeFileSync(`script_block_${count}.json`, JSON.stringify(parsed, null, 2));
          console.log(`Successfully parsed and saved script_block_${count}.json!`);
        } catch {
          // If it fails to parse direct JSON, let's find if there's an assignment like:
          // var state = { ... };
          console.log(`Failed to parse script_block_${count} directly as JSON. Trying substring extraction...`);
        }
      }
    }
  }
}

run();
