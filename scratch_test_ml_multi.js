async function main() {
  try {
    const res = await fetch("https://api.mercadolibre.com/items?ids=MLB6722221764");
    if (!res.ok) {
      console.log("Error:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("SUCCESS! Title:", data[0]?.body?.title);
    console.log("Secondary image:", data[0]?.body?.pictures?.[1]?.secure_url);
  } catch (err) {
    console.error(err);
  }
}
main();
