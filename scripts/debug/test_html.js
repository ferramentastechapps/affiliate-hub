async function run() {
    const apiRes = await fetch('https://www.mercadolivre.com.br/social/pp20250311151339', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const text = await apiRes.text();
    console.log('__NEXT_DATA__?', text.includes('__NEXT_DATA__'));
    console.log('__INITIAL_STATE__?', text.includes('__INITIAL_STATE__'));
    
    // Find MLB links anywhere in the page
    const productLinks = [...text.matchAll(/produto\.mercadolivre\.com\.br\/MLB-[0-9]+/g)];
    console.log('Product Links Found:', [...new Set(productLinks.map(m => m[0]))]);
}
run();
