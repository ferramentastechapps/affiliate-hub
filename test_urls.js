const { isUsableImageUrl } = require('./.next/server/app/api/admin/products/fix-images/route.js') || {};
const fs = require('fs');

// Fetch trending products
fetch('https://economizei.ftech-apps.com.br/api/products/trending')
  .then(res => res.json())
  .then(data => {
    console.log("Checking trending images...");
    const products = data.products || [];
    let blocked = 0;
    
    // Fallback if require failed
    const checkUrl = (url) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      const invalidPatterns = ["01rmkvkk-ll", "31ptvi11gml", "41vok2o740l"];
      const hasPattern = invalidPatterns.some(p => lower.includes(p));
      return !lower.includes("unavailable") && !lower.includes("no-image") && 
             !lower.includes("noimage") && !lower.includes("no_image") && 
             !lower.includes("placeholder") && !hasPattern;
    };
    
    for (const p of products) {
       console.log(`Product: ${p.name}`);
       console.log(`URL: ${p.imageUrl} -> ${checkUrl(p.imageUrl)}`);
       if (p.enhancedImageUrl) {
         console.log(`Enhanced: ${p.enhancedImageUrl} -> ${checkUrl(p.enhancedImageUrl)}`);
       }
       
       if (!checkUrl(p.imageUrl) && (!p.enhancedImageUrl || !checkUrl(p.enhancedImageUrl))) {
         blocked++;
       }
    }
    console.log(`Total blocked by logic: ${blocked}/${products.length}`);
  });
