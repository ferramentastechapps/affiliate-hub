const http = require('http');
const d = JSON.stringify({message: 'Teste bot OK!', score: 10});
const r = http.request({host:'localhost',port:3006,path:'/send',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{res.on('data',c=>console.log(c.toString()))});
r.write(d);
r.end();
