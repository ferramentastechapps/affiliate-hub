SELECT COUNT(*) FROM "ProductImage";
SELECT name, brand, subcategory, "platformProductId" FROM "Product" WHERE brand IS NOT NULL LIMIT 5;
SELECT platform, "sourceUrl", "affiliateUrl", "generatedAffiliateUrl" FROM "ProductLink" LIMIT 5;
