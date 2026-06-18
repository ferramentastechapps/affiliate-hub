const apiUrl = 'https://economizei.ftech-apps.com.br/api/products';
const headers = { 'x-api-key': 'f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598' };

async function deleteAll() {
  console.log('Buscando produtos...');
  let response = await fetch(`${apiUrl}?status=all`, { headers });
  if (!response.ok) {
    console.error(`Falha ao buscar produtos. Status: ${response.status} ${response.statusText}`);
    return;
  }
  let products = await response.json();
  console.log(`Encontrados ${products.length} produtos.`);
  
  let deletedCount = 0;
  for (const product of products) {
    console.log(`Deletando: ${product.name} (ID: ${product.id})...`);
    let delRes = await fetch(`${apiUrl}/${product.id}`, { method: 'DELETE', headers });
    if (delRes.ok) deletedCount++;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\n🎉 Concluído! ${deletedCount} produtos apagados.`);
}

deleteAll().catch(console.error);
