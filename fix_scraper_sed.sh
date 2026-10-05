sed -i '196,214c\
    if (!imageUrl || (!imageUrl.startsWith('"'"'http'"'"') && imageUrl !== '"'"'/placeholder.webp'"'"')) {\
      imageUrl = '"'"'/placeholder.webp'"'"';\
      console.warn('"'"'⚠️ Imagem original não encontrada. Mantendo placeholder genérico sem usar DuckDuckGo.'"'"');\
    }\
' src/lib/scraper.ts
