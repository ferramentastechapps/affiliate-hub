const fs = require('fs');
const data = fs.readFileSync('vitrine_state.json', 'utf8');
const match = data.match(/"metadata"\s*:\s*\{[^}]*?\}/g);
if (match) {
  console.log('Found metadata blocks:');
  match.slice(0, 3).forEach(m => console.log(m));
} else {
  console.log('no metadata block found');
}
