import fs from 'fs';

function inspect() {
  const html = fs.readFileSync('ml_social_page.html', 'utf8');
  
  console.log('HTML Length:', html.length);
  
  // Search for "Fluir" or "Olympikus" (case-insensitive)
  const query = /olympikus/i;
  const index = html.search(query);
  if (index !== -1) {
    console.log('Found "olympikus" at index:', index);
    console.log('Context:', html.substring(index - 100, index + 300));
  } else {
    console.log('"olympikus" NOT found in HTML!');
  }
  
  // Let's print out what is around "MLB6894444856"
  const mIndex = html.indexOf('MLB6894444856');
  if (mIndex !== -1) {
    console.log('Found "MLB6894444856" at index:', mIndex);
    console.log('Context:', html.substring(mIndex - 200, mIndex + 200));
  }
}

inspect();
