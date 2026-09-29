import * as cheerio from 'cheerio';

async function searchAmazonImages(query: string) {
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  console.log("Fetching AWS: " + url);
  try {
    const res = await fetch(url, {
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const images: string[] = [];
    $('img.s-image').each((i, el) => {
        const src = $(el).attr('src');
        if (src) images.push(src);
    });
    console.log(`Found ${images.length} Amazon images. First 2:`);
    console.log(images.slice(0, 2));
  } catch (e) {
      console.log(e);
  }
}
searchAmazonImages("iphone 15 pro max");
