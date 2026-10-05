import { searchDuckDuckGoImages } from "./src/lib/scraper";
async function run() {
  const query = "Bucal Protetor Moldavel Anti Ronco";
  const results = await searchDuckDuckGoImages(query);
  console.log("DDG results for Bucal Protetor:", results.length);
  if (results.length > 0) {
    console.log("1:", results[0].image);
    console.log("2:", results[1]?.image);
  }
}
run();
