import fs from 'fs';

function testParse() {
  const html = fs.readFileSync('live_social.html', 'utf8');
  
  const match = html.match(/_n\.ctx\.r\s*=\s*(\{[\s\S]+?\});/);
  if (!match) {
    console.log('Could not find _n.ctx.r');
    return;
  }
  
  const jsonStr = match[1];
  try {
    const state = JSON.parse(jsonStr);
    const components = state?.appProps?.pageProps?.data?.components || [];
    const featuredComponent = components.find((c: any) => c.id === 'card-featured');
    if (featuredComponent) {
      console.log('featuredComponent structure:');
      console.log(JSON.stringify(featuredComponent, null, 2));
    } else {
      console.log('card-featured component not found');
    }
  } catch (err: any) {
    console.error('JSON parse error:', err.message);
  }
}

testParse();
