import { searchDuckDuckGoImages } from "./src/lib/scraper";
async function run() {
  const query = "Bucal Protetor Moldavel Anti Ronco";
  const results = await searchDuckDuckGoImages(query);
  console.log("DDG results for Bucal Protetor:", results.length);
  for (let i = 0; i < 3; i++) {
    console.log(i, results[i].title, results[i].image);
  }
}
run();
