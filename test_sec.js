const url = 'https://mercadolivre.com/sec/2pNsGkD';
fetch(url, { redirect: 'follow' })
  .then(async res => {
    console.log('Final URL:', res.url);
    const text = await res.text();
    console.log('HTML Length:', text.length);
    const links = text.match(/href=["'](.*?)["']/g) || [];
    console.log('Links found:', links.length);
    const mlbLinks = links.filter(l => l.includes('MLB'));
    console.log('MLB Links:', mlbLinks.slice(0, 10));
    const listsLinks = links.filter(l => l.includes('/lists'));
    console.log('Lists Links:', listsLinks.slice(0, 10));
    
    // Check if there is preloaded state
    if (text.includes('__PRELOADED_STATE__')) {
        console.log('Has PRELOADED_STATE!');
    }
  })
  .catch(console.error);
