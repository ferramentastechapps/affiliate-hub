import { searchBingImages, searchDuckDuckGoImages } from './src/lib/scraper';

async function test() {
  console.log("=== BING ===");
  const res1 = await searchBingImages("Placa Mãe MSI PRO B760M-A WIFI comprar");
  console.log(res1.slice(0, 3));

  console.log("\n=== DDG ===");
  const res2 = await searchDuckDuckGoImages("Placa Mãe MSI PRO B760M-A WIFI comprar");
  console.log(res2.slice(0, 3));
}
test();
