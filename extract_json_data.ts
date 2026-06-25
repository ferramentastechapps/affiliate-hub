import fs from 'fs';

function extract() {
  const content = fs.readFileSync('script_block_1.txt', 'utf8');
  console.log('Script Content length:', content.length);
  
  // Print first 500 chars
  console.log('--- START ---');
  console.log(content.substring(0, 800));
  console.log('--- END ---');
  
  // Let's find any object assignment or JSON string
  // Let's search for keys like "featured", "polycards", "highlighted"
  const keywords = ['featured', 'highlighted', 'polycards', 'unique_id'];
  for (const kw of keywords) {
    const idx = content.indexOf(kw);
    if (idx !== -1) {
      console.log(`Keyword "${kw}" found at index ${idx}:`);
      console.log(content.substring(idx - 100, idx + 300));
      console.log('-----------------------------------');
    }
  }
}

extract();
