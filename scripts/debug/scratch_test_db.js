const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" } } });

async function main() {
    console.log("--- SMOKE TEST DB RESULTS ---");
    const imagesCount = await prisma.productImage.count();
    console.log("ProductImage Count:", imagesCount);
    
    const products = await prisma.product.findMany({
        where: { brand: { not: null } },
        select: { name: true, brand: true, subcategory: true, platformProductId: true },
        take: 5
    });
    console.log("Products with brand/subcategory:");
    console.log(JSON.stringify(products, null, 2));
    
    const links = await prisma.productLink.findMany({ take: 5 });
    console.log("ProductLinks:");
    console.log(JSON.stringify(links, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
