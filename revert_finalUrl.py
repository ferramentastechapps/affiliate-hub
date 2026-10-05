import re

with open('src/lib/scraper.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Revert to original url for slugName extraction
code = code.replace(
    "const slugName = extractNameFromUrl(finalUrl);",
    "const slugName = extractNameFromUrl(url); // Use original URL because final might be a captcha page"
)

with open('src/lib/scraper.ts', 'w', encoding='utf-8') as f:
    f.write(code)

