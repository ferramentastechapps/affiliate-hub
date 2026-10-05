sed -i '1526,1549c\
               if (product.imageUrl && (product.imageUrl.includes('"'"'pechinchou.com.br'"'"') || product.imageUrl.includes('"'"'assets.pechinchou.com.br'"'"'))) {\
                 console.log(`[Webhook Batch AI] 🚫 Imagem do Pechinchou bloqueada. Sem fallback habilitado. Usando placeholder.`);\
                 finalImageUrl = '"'"'"'"';\
               }\
' src/app/api/webhook/products/route.ts
