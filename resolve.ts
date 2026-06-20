import { resolveRedirect } from './src/lib/affiliate';

async function main() {
  const url = 'https://meli.la/1Mog8H5';
  console.log('Resolving:', url);
  const resolved = await resolveRedirect(url);
  console.log('Resolved URL:', resolved);
}

main();
