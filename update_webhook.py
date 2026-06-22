import re

with open('src/app/api/webhook/products/route.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update processProductAffiliates
old_func = """async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  let hasAffiliate = false;
  let isAggregatorFailed = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const generated = await generateAffiliateLink(originalUrl);
        if (generated) {
          generatedLinks[platform] = generated;
          hasAffiliate = true;
        } else {
          const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
          if (isAggregator) {
            console.log(`[Webhook] Falha ao resolver link do agregador ${originalUrl}. Produto será descartado.`);
            isAggregatorFailed = true;
          } else {
            generatedLinks[platform] = originalUrl;
          }
        }
      } catch (e) {
        console.error(`Erro ao gerar link de afiliado para ${platform}:`, e);
        const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
        if (isAggregator) {
           isAggregatorFailed = true;
        } else {
           generatedLinks[platform] = originalUrl;
        }
      }
    }
  }

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    status: hasAffiliate ? 'active' : 'pending'
  };
}"""

new_func = """async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  const productLinksData: Array<{ platform: string, sourceUrl?: string, affiliateUrl?: string, generatedAffiliateUrl?: string, isActive: boolean }> = [];
  let hasAffiliate = false;
  let isAggregatorFailed = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const generated = await generateAffiliateLink(originalUrl);
        if (generated) {
          generatedLinks[platform] = generated;
          productLinksData.push({
            platform,
            sourceUrl: originalUrl,
            affiliateUrl: originalUrl,
            generatedAffiliateUrl: generated,
            isActive: true
          });
          hasAffiliate = true;
        } else {
          const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
          if (isAggregator) {
            console.log(`[Webhook] Falha ao resolver link do agregador ${originalUrl}. Produto será descartado.`);
            isAggregatorFailed = true;
          } else {
            generatedLinks[platform] = originalUrl;
            productLinksData.push({
              platform,
              sourceUrl: originalUrl,
              affiliateUrl: originalUrl,
              isActive: true
            });
          }
        }
      } catch (e) {
        console.error(`Erro ao gerar link de afiliado para ${platform}:`, e);
        const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
        if (isAggregator) {
           isAggregatorFailed = true;
        } else {
           generatedLinks[platform] = originalUrl;
           productLinksData.push({
             platform,
             sourceUrl: originalUrl,
             affiliateUrl: originalUrl,
             isActive: true
           });
        }
      }
    }
  }

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    productLinksData,
    status: hasAffiliate ? 'active' : 'pending'
  };
}"""

code = code.replace(old_func, new_func)

# We will apply regex replacements for POST and PUT blocks

# 2. Existing Product Logic (POST and PUT)
# Find `const { links: processedLinks } = await processProductAffiliates(body);` or `(productData)` inside `if (existingProduct) { ... }`
# We'll use a regex to find the block for existing product link processing
def replace_existing_product_logic(match):
    prefix = match.group(1)
    body_var = match.group(2) # 'body' or 'productData'
    return f"""
{prefix}const skipProcessing = existingProduct.aiProcessed && existingProduct.affiliateProcessed;
{prefix}let linksData = undefined;
{prefix}let productLinksDataUpdate: any[] = [];
{prefix}
{prefix}if (!skipProcessing) {{
{prefix}  const {{ links: processedLinks, productLinksData }} = await processProductAffiliates({body_var});
{prefix}  productLinksDataUpdate = productLinksData;
{prefix}  const linksUpdate: Record<string, string> = {{}};
{prefix}  if (processedLinks) {{
{prefix}    const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
{prefix}    for (const platform of platforms) {{
{prefix}      const newLink = processedLinks[platform];
{prefix}      const oldLink = existingProduct.links?.[platform as keyof typeof existingProduct.links];
{prefix}      if (newLink) {{
{prefix}        const isOldAggregator = !oldLink || (typeof oldLink === 'string' && (oldLink.includes('promobit.com.br') || oldLink.includes('pechinchou.com.br')));
{prefix}        const isNewDirect = !newLink.includes('promobit.com.br') && !newLink.includes('pechinchou.com.br');
{prefix}        if (isOldAggregator && isNewDirect) {{
{prefix}          linksUpdate[platform] = newLink;
{prefix}        }}
{prefix}      }}
{prefix}    }}
{prefix}  }}
{prefix}  if (Object.keys(linksUpdate).length > 0 && !existingProduct.isFixed) {{
{prefix}    linksData = existingProduct.links ? {{ update: linksUpdate }} : {{ create: linksUpdate }};
{prefix}  }}
{prefix}}}
"""

code = re.sub(
    r'(^[ \t]+)// Processar links novos para ver se temos novos links de afiliados\s+const \{ links: processedLinks \} = await processProductAffiliates\((body|productData)\);\s+const linksUpdate: Record<string, string> = \{\};\s+if \(processedLinks\).*?if \(existingProduct\.links\) \{\s+linksData = \{ update: linksUpdate \};\s+\} else \{\s+linksData = \{ create: linksUpdate \};\s+\}\s+\}',
    replace_existing_product_logic,
    code,
    flags=re.MULTILINE | re.DOTALL
)

# Replace update product to include new fields
def replace_product_update(match):
    prefix = match.group(1)
    body_var = match.group(2)
    return f"""{prefix}const updatedProduct = await prisma.product.update({{
{prefix}  where: {{ id: existingProduct.id }},
{prefix}  data: {{ 
{prefix}    price: parseFloat({body_var}.price),
{prefix}    originalPrice: {body_var}.originalPrice ? parseFloat({body_var}.originalPrice) : existingProduct.originalPrice,
{prefix}    subcategory: {body_var}.subcategory || existingProduct.subcategory,
{prefix}    brand: {body_var}.brand || existingProduct.brand,
{prefix}    model: {body_var}.model || existingProduct.model,
{prefix}    platformProductId: {body_var}.platformProductId || existingProduct.platformProductId,
{prefix}    storeName: {body_var}.storeName || existingProduct.storeName,
{prefix}    ...imageUpdateData,
{prefix}    links: linksData
{prefix}  }},
{prefix}  include: {{
{prefix}    links: true
{prefix}  }}
{prefix}}});
{prefix}existingProduct = updatedProduct;
{prefix}
{prefix}for (const pl of productLinksDataUpdate) {{
{prefix}  await prisma.productLink.upsert({{
{prefix}    where: {{ productId_platform: {{ productId: existingProduct.id, platform: pl.platform }} }},
{prefix}    create: {{ ...pl, productId: existingProduct.id }},
{prefix}    update: {{ sourceUrl: pl.sourceUrl, affiliateUrl: pl.affiliateUrl, generatedAffiliateUrl: pl.generatedAffiliateUrl }}
{prefix}  }});
{prefix}}}"""

code = re.sub(
    r'(^[ \t]+)const updatedProduct = await prisma\.product\.update\(\{\s+where: \{ id: existingProduct\.id \},\s+data: \{\s+price: parseFloat\((body|productData)\.price\),\s+originalPrice: .*?links: linksData\s+\},\s+include: \{\s+links: true\s+\}\s+\}\);\s+(?:existingProduct = updatedProduct;)?',
    replace_product_update,
    code,
    flags=re.MULTILINE | re.DOTALL
)

# 3. New Product Logic (POST and PUT)
def replace_process_affiliates_new(match):
    prefix = match.group(1)
    body_var = match.group(2)
    return f"{prefix}const {{ links: processedLinks, productLinksData, status: processedStatus }} = await processProductAffiliates({body_var});"

code = re.sub(
    r'(^[ \t]+)const \{ links: processedLinks, status: processedStatus \} = await processProductAffiliates\((body|productData)\);',
    replace_process_affiliates_new,
    code,
    flags=re.MULTILINE
)

def replace_product_create(match):
    prefix = match.group(1)
    body_var = match.group(2)
    return f"""{prefix}const imagesToCreate = [];
{prefix}if (Array.isArray({body_var}.images) && {body_var}.images.length > 0) {{
{prefix}  {body_var}.images.forEach((url: string, index: number) => {{
{prefix}    imagesToCreate.push({{ url, source: index === 0 ? 'scraper' : 'scraper_gallery', isPrimary: index === 0, order: index }});
{prefix}  }});
{prefix}}} else if ({body_var}.imageUrl) {{
{prefix}  imagesToCreate.push({{ url: {body_var}.imageUrl, source: 'scraper', isPrimary: true, order: 0 }});
{prefix}}}
{prefix}
{prefix}const product = await prisma.product.create({{
{prefix}  data: {{
{prefix}    name: {body_var}.name,
{prefix}    category: {body_var}.category,
{prefix}    subcategory: {body_var}.subcategory || null,
{prefix}    brand: {body_var}.brand || null,
{prefix}    model: {body_var}.model || null,
{prefix}    platformProductId: {body_var}.platformProductId || null,
{prefix}    storeName: {body_var}.storeName || null,
{prefix}    description: {body_var}.description || null,
{prefix}    imageUrl: {body_var}.imageUrl,
{prefix}    price: {body_var}.price ? parseFloat({body_var}.price) : null,
{prefix}    originalPrice: {body_var}.originalPrice ? parseFloat({body_var}.originalPrice) : null,
{prefix}    status: finalStatus,
{prefix}    externalId: {body_var}.externalId || null,
{prefix}    links: processedLinks ? {{
{prefix}      create: {{
{prefix}        amazon: processedLinks.amazon || null,
{prefix}        mercadoLivre: processedLinks.mercadoLivre || null,
{prefix}        shopee: processedLinks.shopee || null,
{prefix}        aliexpress: processedLinks.aliexpress || null,
{prefix}        tiktok: processedLinks.tiktok || null,
{prefix}        netshoes: processedLinks.netshoes || null,
{prefix}        magalu: processedLinks.magalu || null,
{prefix}        kabum: processedLinks.kabum || null,
{prefix}      }}
{prefix}    }} : undefined,
{prefix}    productLinks: productLinksData && productLinksData.length > 0 ? {{
{prefix}      create: productLinksData
{prefix}    }} : undefined,
{prefix}    images: imagesToCreate.length > 0 ? {{
{prefix}      create: imagesToCreate
{prefix}    }} : undefined
{prefix}  }},
{prefix}  include: {{
{prefix}    links: true
{prefix}  }}
{prefix}}});"""

code = re.sub(
    r'(^[ \t]+)const product = await prisma\.product\.create\(\{\s+data: \{\s+name: (body|productData)\.name.*?links: true\s+\}\s+\}\);',
    replace_product_create,
    code,
    flags=re.MULTILINE | re.DOTALL
)

with open('src/app/api/webhook/products/route.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated route.ts successfully.")
