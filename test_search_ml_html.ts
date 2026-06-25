import fs from 'fs';

function run() {
  const html = fs.readFileSync('ml_social_page.html', 'utf8');
  const index = html.toLowerCase().indexOf('ir para');
  console.log(`Index of 'ir para':`, index);
  if (index !== -1) {
    const start = Math.max(0, index - 300);
    const end = Math.min(html.length, index + 500);
    console.log(html.substring(start, end));
  } else {
    console.log("Could not find 'ir para' in HTML.");
  }
}

run();
