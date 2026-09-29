const urls = [
  "https://m.media-amazon.com/images/I/01rmKvkK-lL._AC_.jpg",
  "https://example.com/unavailable.jpg",
  "https://example.com/NO-IMAGE.png",
  "https://images.shopee.com/placeholder.jpg"
]
const isUsable = (url) => {
  if (!url || url === '/placeholder.webp') return false;
  const l = url.toLowerCase();
  return !l.includes('unavailable') 
      && !l.includes('no-image') 
      && !l.includes('no_image') 
      && !l.includes('noimage') 
      && !l.includes('placeholder')
      && !l.includes('01rmkvkk-ll')
      && !l.includes('01rmkvkk-ll'); // actually amazon is 01rmKvkK-lL
}
urls.forEach(u => console.log(isUsable(u)));
