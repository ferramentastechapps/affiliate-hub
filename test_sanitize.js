const fs = require('fs');
const { sanitizeImageUrl, isUsableImageUrl } = require('./src/lib/imageUtils');

const url = "https://assets.pechinchou.com.br/media/img/products/social/c892fcba-92ed-4337-9de7-20f6e5a7673a.jpg";
console.log("isUsable:", isUsableImageUrl(url));
console.log("sanitize:", sanitizeImageUrl(url));

const url2 = "/enhanced/enhanced_1783534727338_2dba4935305ea243.jpg";
console.log("isUsable2:", isUsableImageUrl(url2));
console.log("sanitize2:", sanitizeImageUrl(url2));

