async function searchDuckDuckGoImages(query) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const vqdMatch = html.match(/vqd=([^&'"]+)/) || html.match(/vqd\s*=\s*['"]([^'"]+)['"]/);
    if (!vqdMatch) return [];
    
    const vqd = vqdMatch[1];
    const jsonUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
    const jsonRes = await fetch(jsonUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await jsonRes.json();
    return data.results || [];
  } catch (err) { return []; }
}
async function main() {
  const res = await searchDuckDuckGoImages("iphone");
  console.log(res[0]);
}
main();
