async function searchDDGImages(query: string) {
  // First get the VQD token
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&va=b&t=hc&iax=images&ia=images`;
  const res = await fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  // find vqd='something' or vqd="something"
  const vqdMatch = html.match(/vqd=["']([^"']+)["']/);
  
  if (!vqdMatch) {
    console.log("No vqd found");
    return;
  }
  
  const vqd = vqdMatch[1];
  console.log("Got vqd:", vqd);
  
  // Now hit the image API
  const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=br-pt&vqd=${vqd}`;
  const apiRes = await fetch(apiUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
    }
  });
  
  if (!apiRes.ok) {
    console.log("API failed HTTP " + apiRes.status);
    return;
  }
  
  const json = await apiRes.json();
  console.log("Found results:", json.results?.length);
  console.log("First 2 images:");
  if (json.results) {
      console.log(json.results.slice(0, 2).map((r: any) => r.image));
  }
}

searchDDGImages("iphone 15 pro max");
