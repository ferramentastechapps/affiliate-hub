import fs from 'fs';

function findMatches() {
  const html = fs.readFileSync('ml_social_page.html', 'utf8');
  
  console.log('Searching for "100371975037" (Olympikus ID)...');
  let idx = 0;
  while (true) {
    idx = html.indexOf('100371975037', idx);
    if (idx === -1) break;
    console.log(`Found Olympikus ID at index ${idx}:`);
    console.log(html.substring(idx - 100, idx + 200));
    idx += 1;
  }

  console.log('\nSearching for first 5 instances of "metadata" containing "id":"MLB":');
  const regex = /"metadata"\s*:\s*\{[^}]*?"id"\s*:\s*"(MLB\d+)"/gi;
  let match;
  let count = 0;
  while ((match = regex.exec(html)) !== null && count < 5) {
    console.log(`Match ${++count} at index ${match.index}:`);
    console.log(`Matched ID: ${match[1]}`);
    console.log(`Context: ${html.substring(match.index, match.index + 200)}`);
  }
}

findMatches();
