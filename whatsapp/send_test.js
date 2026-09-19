const http = require('http');

const payload = JSON.stringify({
  imageUrl: 'https://m.media-amazon.com/images/I/71Swqqe7XAL._AC_SX425_.jpg',
  message: '🧪 *Teste de Imagem do Bot* 📸\n\nSe você estiver visualizando esta foto junto com o texto, a transmissão de fotos do WhatsApp Group está 100% OPERACIONAL! 🚀'
});

const req = http.request({
  hostname: 'localhost',
  port: 3006,
  path: '/test-media',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(payload);
req.end();
