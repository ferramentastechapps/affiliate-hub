import * as cheerio from 'cheerio';

async function testBing(query: string) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
  console.log("Fetching: " + url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  
  const text = await response.text();
  const $ = cheerio.load(text);
  
  const images: any[] = [];
  $('a.iusc').each((i, el) => {
    const m = $(el).attr('m');
    if (m) {
      try {
        const data = JSON.parse(m);
        // data.murl has the full image
        images.push({
           image: data.murl,
           thumbnail: data.turl,
           source: data.purl
        });
      } catch (e) {}
    }
  });
  
  console.log(`Found ${images.length} images`);
  console.log("First 2 images:");
  console.log(images.slice(0, 2));
}

testBing("iphone 15 pro max");
