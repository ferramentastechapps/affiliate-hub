const url = "https://www.mercadolivre.com.br/social/promobit?matt_word=jotashopcases&matt_tool=57548960&forceInApp=true&ref=BCEgHCltfHe%2FwMaFCBNcB0qFAnDuGpW9rRjyJuVZNFpKqLtEF88ptFD%2BrBiRu9oB%2Bju%2B35T0CCvSMPlzNE9ZMjo9uOs9Of6uLUPSPD%2By2E2TvHnwNjpwljkXU4rONj3YpDlXOZrnymYHkdIjmEbn2skDNnc7HeXzDAvqUeiTC6kTr%2FILiyWchOwSkGERJAvyMOGQ0%2F4%3D";

fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
})
.then(res => res.text())
.then(html => {
  const fs = require('fs');
  fs.writeFileSync('temp_social.html', html);
  console.log("Saved to temp_social.html");
});
