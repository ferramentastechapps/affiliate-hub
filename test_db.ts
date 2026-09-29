import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  })
  
  console.log("Recent products:");
  for (const p of products) {
    console.log(`[${p.id}] ${p.name.substring(0, 30)}... | Img: ${p.imageUrl} | Enh: ${p.enhancedImageUrl}`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
