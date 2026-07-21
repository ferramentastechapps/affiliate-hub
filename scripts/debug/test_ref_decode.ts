function testDecode() {
  const refs = [
    'BH14ZNh5MQo5hjlQuAkAYU5e9Cvdj%2F3%2FVoE%2FQ%2F5IYF6KWNvMzKSID3hJKAQmbqlw1d9XJBNpDMCCTgcjl%2Ba7Sa3Jp44is9Q7QR%2FdJjF4N38YV8N511gZ8L1M4e7hL3h1L2h5h1h3h2h3h%2Bh5h5h3h2h3h4h2h3h5h1h3h2h3h2h1h3h2h3h3h5h%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F',
    'BHf42Nh6MQo5bjIQuAkAYUSe9Cvdj%2F3cEVceQ0%2FSlYE6KWNvMzKSiD3hJKAQmbqIw1dX9jKBNpDMCCtGCjLbaZSa3Jp44is9QzQR%2Fd2jFsr3NO3mRHIED8Q7P1VcxLmIrEsPG6CiQYDyJoV7wfuJVke0oLtnbGeCP8IvcnfALMSIYRj4KgsATXO%2B3nAoq0CxMknwosixmOZLIraj'
  ];

  for (const ref of refs) {
    const decodedRef = decodeURIComponent(ref);
    console.log(`Ref: ${ref.substring(0, 30)}...`);
    console.log(`Decoded URI: ${decodedRef.substring(0, 30)}...`);
    
    // Try base64 decode
    try {
      const buf = Buffer.from(decodedRef.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      console.log('As UTF-8 string (first 150 chars):');
      console.log(buf.toString('utf8').substring(0, 150));
      console.log('As Hex (first 20 bytes):');
      console.log(buf.toString('hex').substring(0, 40));
    } catch (err) {
      console.log('Base64 decode failed:', err.message);
    }
    
    // Try parts (split by '.')
    const parts = decodedRef.split('.');
    console.log(`Parts count: ${parts.length}`);
    if (parts.length >= 2) {
      try {
        const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        console.log('Part 2 payload:', payload);
      } catch (err) {
        console.log('Part 2 base64 decode failed:', err.message);
      }
    }
    console.log('-------------------------------------');
  }
}

testDecode();
